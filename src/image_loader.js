function Loader(resources, colorSet) {
  this.list = [];
  this.resources = resources;
  this.colorSet = colorSet;
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
  img.colorSet = this.colorSet;

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
  return make;
}

ImagePlane.prototype.fillData = function() {
  if (this.data == null) {
    let numPixels = this.height * this.width;
    this.data = new Uint8Array(numPixels);
    this.alpha = new Uint8Array(numPixels);
  }
  for (let y = 0; y < this.height; y++) {
    for (let x = 0; x < this.width; x++) {
      let k = y * this.pitch + x;
      let r = this.rgbBuff[k*4+0];
      let g = this.rgbBuff[k*4+1];
      let b = this.rgbBuff[k*4+2];
      let c = 0;
      this.alpha[k] = this.rgbBuff[k*4+3];
      if (this.alpha[k] >= 0x80) {
        // Transparent pixels are not added to the colorSet.
        c = this.colorSet.addEntry(r * 0x10000 + g * 0x100 + b);
        this.data[k] = c;
      }
    }
  }
}

module.exports.Loader = Loader;
