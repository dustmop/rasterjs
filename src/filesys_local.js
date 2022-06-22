const fs = require('fs');
const PNG = require('pngjs').PNG;
const jpeg = require('jpeg-js');

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
    if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) {
      this._loadJpegImage(filename, imgPlane);
      return 0;
    }
    if (filename.endsWith('.png')) {
      let image = PNG.sync.read(bytes);
      let pitch = image.width;
      imgPlane.rgbBuff = image.data;
      imgPlane.width = image.width;
      imgPlane.pitch = pitch;
      imgPlane.height = image.height;
      return 0;
    }
    throw new Error(`invalid image format type: ${filename}`);
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

  _loadJpegImage(filename, img) {
    let binData = fs.readFileSync(filename);
    var rawImageData = jpeg.decode(binData, {useTArray: true});
    img.width = rawImageData.width;
    img.height = rawImageData.height;
    img.rgbBuff = rawImageData.data;
    img.pitch = img.width;
    return 1;
  }

  whenLoaded(cb) {
    cb();
  }
}

module.exports.FilesysAccess = FilesysAccess;
