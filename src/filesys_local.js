const fs = require('fs');
const PNG = require('pngjs').PNG;

class FilesysAccess {
  constructor() {
    this.clear();
    return this;
  }

  clear() {
  }

  readImageData(filename, imgPlane) {
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

  readText(filename) {
    let text = fs.readFileSync(filename).toString();
    let file = {
      src: filename,
      content: text,
    };
    return file;
  }

  saveTo(filename, surfaces) {
    let surf = surfaces[0];
    let image = {
      width: surf.width,
      height: surf.height,
      data: surf.buff,
    }
    let bytes = PNG.sync.write(image);
    fs.writeFileSync(filename, bytes);
  }

  whenLoaded(cb) {
    cb();
  }
}

module.exports.FilesysAccess = FilesysAccess;
