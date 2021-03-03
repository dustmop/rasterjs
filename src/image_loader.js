function Loader(envBackend) {
  this.pending = false;
  this.assets = [];
  this.envBackend = envBackend;
  return this;
}

Loader.prototype.loadBegin = function(filepath) {
  let img = new ImagePlane();
  img.filepath = filepath;
  img.loader = this;
  img.id = this.envBackend.readImage(filepath);
  return img;
}

function ImagePlane() {
  this.filepath = null;
  this.loader = null;
  this.id = null;
  this.slice = null;
  return this;
}

ImagePlane.prototype.copy = function(x, y, w, h) {
  let make = new Image();
  make.filepath = this.filepath;
  make.loader = this.loader;
  make.id = this.id;
  make.slice = [x, y, w, h];
  return make;
}

ImagePlane.prototype.getPixels = function() {
  return this.loader.envBackend.getImagePixels(this.id);
}

module.exports.Loader = Loader;

