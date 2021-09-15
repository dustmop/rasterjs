const rgbColor = require('./rgb_color.js');

function Loader(resources, scene) {
  this.list = [];
  this.resources = resources;
  this.scene = scene;
  return this;
}

Loader.prototype.loadImage = function(filename) {
  let img = new ImagePlane();
  img.filename = filename;
  img.id = this.list.length;
  img.left = 0;
  img.top = 0;
  // resources.openImage assigns these:
  img.elemNode = null;
  img.width = 0;
  img.height = 0;
  img.pitch = 0;
  img.data = null;
  img.colorSet = this.scene.colorSet;
  img.palette = this.scene.palette;

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
    } else {
      throw 'ERROR!';
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
  this.filename = null;
  this.id = null;
  this.slice = null;
  this.width = 0;
  this.height = 0;
  this.data = null;
  this.alpha = null;
  this.rgbBuff = null;
  this.data = null;
  this.colorSet = null;
  this.palette = null;
  return this;
}

ImagePlane.prototype.copy = function(x, y, w, h) {
  let make = new ImagePlane();
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
  return make;
}

ImagePlane.prototype.fillData = function() {
  if (this.data == null) {
    let numPixels = this.height * this.width;
    this.data = new Uint8Array(numPixels);
    this.alpha = new Uint8Array(numPixels);
  }
  let palette = this.palette;
  let remap = {};
  for (let y = 0; y < this.height; y++) {
    for (let x = 0; x < this.width; x++) {
      let k = y * this.pitch + x;
      let r = this.rgbBuff[k*4+0];
      let g = this.rgbBuff[k*4+1];
      let b = this.rgbBuff[k*4+2];
      let c = 0;
      this.alpha[k] = this.rgbBuff[k*4+3];
      // Transparent pixels are not added to the colorSet.
      if (this.alpha[k] >= 0x80) {
        // Map rgb values to the colorSet and palette
        let rgbval = r * 0x10000 + g * 0x100 + b;
        c = remap[rgbval];
        if (c === undefined) {
          if (palette) {
            let cval = this.colorSet.find(rgbval);
            if (cval == -1) {
              c = palette.insertWhereAvail(rgbval);
              if (c == null) {
                throw new Error(`TODO: fix this error, add a test`);
              }
            } else {
              c = palette.find(cval);
              if (c == null) {
                throw new Error(`image uses valid colors, but palette is full. color=0x${rgbval.toString(16)}`);
              }
            }
          } else {
            c = this.colorSet.addEntry(rgbval);
          }
          if (c == undefined) {
            throw new Error(`unknown color: 0x${rgbval.toString(16)}`);
          }
          remap[rgbval] = c;
        }
        this.data[k] = c;
      }
    }
  }
}

module.exports.Loader = Loader;
