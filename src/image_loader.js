const rgbColor = require('./rgb_color.js');
const algorithm = require('./algorithm.js');
const palette = require('./palette.js');

function Loader(resources, scene) {
  this.list = [];
  this.resources = resources;
  this.scene = scene;
  return this;
}

Loader.prototype.loadImage = function(filename, opt) {
  if (!filename.endsWith('.png')) {
    throw new Error(`only 'png' images supported, couldn't load ${filename}`);
  }

  let sortUsingHSV = false;
  if (opt.sortColors) {
    if (opt.sortColors == 'usingHSV') {
      sortUsingHSV = true;
    } else {
      throw new Error(`unknown sortColors key "${opt.sortColors}"`);
    }
  } else if (Object.keys(opt) > 0) {
    throw new Error(`unknown option value ${opt}`);
  }

  let img = new ImagePlane();
  img.parentLoader = this;
  img.filename = filename;
  img.id = this.list.length;
  img.colorSet = this.scene.colorSet;
  img.palette = this.scene.palette;
  img.sortUsingHSV = sortUsingHSV;
  img.left = 0;
  img.top = 0;
  // resources.openImage assigns these:
  img.width = 0;
  img.height = 0;
  img.pitch = 0;
  img.data = null;

  let ret = this.resources.openImage(filename, img);
  if (ret == -1) {
    throw new Error('image not found');
  }
  // HACK: openImage should return a uint8array, not ArrayBuffer
  // web_env returns a Uint8Array (but also img.data == null currently)
  // node_env returns an ArrayBuffer
  if (img.rgbBuff) {
    if (img.rgbBuff.constructor.name == 'ArrayBuffer') {
      img.rgbBuff = new Uint8Array(img.rgbBuff);
    } else if (img.rgbBuff.constructor.name == 'Uint8ClampedArray') {
      // pass
    } else {
      throw `error, unknown type for rgbBuff: ${img.rgbBuff.constructor.name}`;
    }
    img.fillData();
  }
  this.list.push(img);
  return img;
}

Loader.prototype.resolveAll = function(cb) {
  let self = this;
  function waitForImageLoad() {
    if (self.resources.allLoaded()) {
      return cb();
    }
    setTimeout(waitForImageLoad, 0);
  }
  // Changing this to be async breaks node_env. Since the node_env has a
  // blocking render loop, this call needs to be synchronous as well.
  waitForImageLoad();
}

function ImagePlane() {
  this.parentLoader = null;
  this.filename = null;
  this.id = null;
  this.slice = null;
  this.width = 0;
  this.height = 0;
  this.data = null;
  this.alpha = null;
  this.rgbBuff = null;
  this.colorSet = null;
  this.palette = null;
  this.sortUsingHSV = false;
  return this;
}

ImagePlane.prototype.ensureReady = function() {
  this.fillData();
}

ImagePlane.prototype.copy = function(x, y, w, h) {
  let make = new ImagePlane();
  make.parentLoader = this.parentLoader;
  make.filename = this.filename;
  make.id = this.id;
  make.left = x;
  make.top = y;
  make.width = w;
  make.height = h;
  make.pitch = this.pitch;
  make.data = this.data;
  make.alpha = this.alpha;
  make.rgbBuff = this.rgbBuff;
  make.colorSet = this.colorSet;
  make.palette = this.palette;
  this.sortUsingHSV = this.sortUsingHSV;
  return make;
}

ImagePlane.prototype.get = function(x, y) {
  let k = y*this.pitch + x;
  return this.data[k];
}

ImagePlane.prototype.put = function(x, y, v) {
  let k = y*this.pitch + x;
  this.data[k] = v;
}

ImagePlane.prototype.fillData = function() {
  if (this.data == null) {
    let numPixels = this.height * this.width;
    this.data = new Uint8Array(numPixels);
    this.alpha = new Uint8Array(numPixels);
  }
  let needs = this._collectColorNeeds();

  let numColors = needs.rgbItems.length
  if (numColors > 0xff) {
    throw new Error(`too many colors in image ${this.filename}: ${numColors}`);
  }

  // Sort the colors, if required.
  if (this.sortUsingHSV) {
    needs.rgbItems = algorithm.sortByHSV(needs.rgbItems);
  }

  // Create mapping from rgb to 8-bit value
  let remap = {};
  for (let i = 0; i < needs.rgbItems.length; i++) {
    let rgbval = needs.rgbItems[i].toInt();
    if (this.palette) {
      let cval = this.colorSet.find(rgbval);
      if (cval == -1) {
        c = this.palette.insertWhereAvail(rgbval);
        if (c == null) {
          throw new Error(`palette exists, and image ${this.filename} uses a color not found in the colorset: ${needs.rgbItems[i]}`);
        }
      } else {
        c = this.palette.find(cval);
        if (c == null) {
          throw new Error(`image uses valid colors, but palette is full. color=0x${rgbval.toString(16)}`);
        }
      }
    } else {
      c = this.colorSet.addEntry(rgbval);
    }
    remap[rgbval] = c;
  }

  // Build the data buffer
  for (let y = 0; y < this.height; y++) {
    for (let x = 0; x < this.width; x++) {
      let k = y * this.pitch + x;
      this.alpha[k] = this.rgbBuff[k*4+3];
      if (this.alpha[k] < 0x80) {
        continue;
      }
      let r = this.rgbBuff[k*4+0];
      let g = this.rgbBuff[k*4+1];
      let b = this.rgbBuff[k*4+2];
      let rgbval = r * 0x10000 + g * 0x100 + b;
      let c = remap[rgbval];
      this.data[k] = c;
    }
  }
}

ImagePlane.prototype._collectColorNeeds = function() {
  let lookup = {};
  let rgbItems = [];
  for (let y = 0; y < this.height; y++) {
    for (let x = 0; x < this.width; x++) {
      let k = y * this.pitch + x;
      this.alpha[k] = this.rgbBuff[k*4+3];
      // Transparent pixels are not added to the colorSet.
      if (this.alpha[k] < 0x80) {
        continue;
      }
      let r = this.rgbBuff[k*4+0];
      let g = this.rgbBuff[k*4+1];
      let b = this.rgbBuff[k*4+2];
      let rgbval = r * 0x10000 + g * 0x100 + b;
      if (lookup[rgbval] !== undefined) {
        continue;
      }
      // New rgb color found, add it
      lookup[rgbval] = rgbItems.length;
      rgbItems.push(new rgbColor.RGBColor(rgbval));
    }
  }
  return {lookup: lookup, rgbItems: rgbItems};
}

ImagePlane.prototype.then = function(cb) {
  this.parentLoader.resolveAll(cb);
}

module.exports.Loader = Loader;
module.exports.ImagePlane = ImagePlane;
