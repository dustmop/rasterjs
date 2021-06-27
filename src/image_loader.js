function Loader(resources) {
  this.list = [];
  this.resources = resources;
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
  this.resources.openImage(filename, img);
  // HACK: openImage should return a uint8array, not ArrayBuffer
  // web_env returns a Uint8Array (but also img.data == null currently)
  // node_env returns an ArrayBuffer
  if (img.data) {
    if (img.data.constructor.name == 'ArrayBuffer') {
      img.data = new Uint8Array(img.data);
    } else {
      throw 'ERROR!';
    }
  }
  this.list.push(img);
  return img;
}

Loader.prototype.resolveAll = function(cb) {
  let self = this;
  function waitForImageLoad() {
    if (self.resources.allImagesLoaded()) {
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
  return make;
}

module.exports.Loader = Loader;
