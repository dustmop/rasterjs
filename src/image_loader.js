const rgbColor = require('./rgb_color.js');
const algorithm = require('./algorithm.js');
const palette = require('./palette.js');
const types = require('./types.js');
const verboseLogger = require('./verbose_logger.js');

let verbose = new verboseLogger.Logger();

function Loader(fsacc, scene) {
  this.list = [];
  this.addedFiles = {};
  this.fsacc = fsacc;
  this.scene = scene;
  return this;
}

Loader.prototype.loadImage = function(filename, opt) {
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

  if (this.addedFiles[filename]) {
    let found = this.addedFiles[filename];
    let planePitch = found.width;
    let imgPlane = new ImagePlane();
    imgPlane.top = found.top || 0;
    imgPlane.left = found.left || 0;
    imgPlane.rgbBuff = found.buff;
    imgPlane.width = found.width;
    imgPlane.pitch = planePitch;
    imgPlane.height = found.height;
    imgPlane.colorSet = this.scene.colorSet;
    imgPlane.fillData();
    return imgPlane;
  }

  if (!filename.endsWith('.png')) {
    throw new Error(`only 'png' images supported, couldn't load ${filename}`);
  }

  let self = this;

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

  // TODO: -1 not found sync, 0 success, 1 async
  let ret = this.fsacc.readImageData(filename, img);
  if (ret == -1) {
    throw new Error('image not found');
  }

  // HACK: openImage should return a uint8array, not ArrayBuffer
  // web_env returns a Uint8Array (but also img.data == null currently)
  // node_env returns an ArrayBuffer
  if (img.rgbBuff) {
    if (img.rgbBuff.constructor.name == 'ArrayBuffer') {
      img.rgbBuff = new Uint8Array(img.rgbBuff);
    } else if (img.rgbBuff.constructor.name == 'Uint8Array') {
      // pass
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

Loader.prototype.insert = function(name, imageSurf) {
  if (!types.isSurface(imageSurf)) {
    throw new Error(`insert: expects surface`);
  }
  this.addedFiles[name] = imageSurf;
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

ImagePlane.prototype.select = function(x, y, w, h) {
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
  make.sortUsingHSV = this.sortUsingHSV;
  return make;
}

ImagePlane.prototype.clone = function() {
  let make = new ImagePlane();
  make.parentLoader = this.parentLoader;
  make.filename = this.filename;
  make.id = this.id;
  make.left = 0;
  make.top = 0;
  make.width = this.width;
  make.height = this.height;
  make.pitch = this.pitch;
  make.colorSet = this.colorSet;
  make.palette = this.palette;
  make.sortUsingHSV = this.sortUsingHSV;
  // Deep copy `make.data`, NOTE: no alpha nor rgbBuff
  make.data = new Uint8Array(this.data.length);
  for (let k = 0; k < this.data.length; k++) {
    make.data[k] = this.data[k];
  }

  return make;
}

ImagePlane.prototype.replace = function(other) {
  if (this.data.length != other.data.length) {
    throw new Error('IMPLEMENT ME: replace with different data length');
  }
  for (let k = 0; k < other.data.length; k++) {
    this.data[k] = other.data[k];
  }
}

ImagePlane.prototype.get = function(x, y) {
  // TODO: offsets `left` and `top`
  x = Math.floor(x);
  y = Math.floor(y);
  if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
    return null;
  }
  let k = y * this.pitch + x;
  return this.data[k];
}

ImagePlane.prototype.put = function(x, y, v) {
  // TODO: offsets `left` and `top`
  x = Math.floor(x);
  y = Math.floor(y);
  if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
    return;
  }
  let k = y * this.pitch + x;
  this.data[k] = Math.floor(v);
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
      c = this.colorSet.extendWith(rgbval);
    }
    remap[rgbval] = c;
  }

  verbose.log(`loading image with rgb map: ${JSON.stringify(remap)}`, 6);

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
  this.parentLoader.fsacc.whenLoaded(cb);
}

module.exports.Loader = Loader;
module.exports.ImagePlane = ImagePlane;
