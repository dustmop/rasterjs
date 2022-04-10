const fs = require('fs');
const PNG = require('pngjs').PNG;

function FilesysAccess() {
  this.clear();
  return this;
}

FilesysAccess.prototype.clear = function() {
}

FilesysAccess.prototype.readImageData = function(filename, imgPlane) {
  let bytes;
  try {
    bytes = fs.readFileSync(filename);
  } catch (e) {
    throw new Error(`image not found`);
  }
  let image = PNG.sync.read(bytes);
  let pitch = image.width;

  imgPlane.rgbBuff = image.data;
  imgPlane.width = image.width;
  imgPlane.pitch = pitch;
  imgPlane.height = image.height;
  return 0;
}

FilesysAccess.prototype.readText = function(filename) {
  let text = fs.readFileSync(filename).toString();
  let file = {
    src: filename,
    content: text,
  };
  return file;
}

FilesysAccess.prototype.saveTo = function(filename, surfaces) {
  let surf = surfaces[0];
  let image = {
    width: surf.width,
    height: surf.height,
    data: surf.buff,
  }
  let bytes = PNG.sync.write(image);
  fs.writeFileSync(filename, bytes);
}

FilesysAccess.prototype.whenLoaded = function(cb) {
  cb();
}

module.exports.FilesysAccess = FilesysAccess;
