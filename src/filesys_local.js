const fs = require('fs');
const PNG = require('pngjs').PNG;
const jpeg = require('jpeg-js');

class FilesysAccess {
  constructor() {
    this.clear();
    return this;
  }

  clear() {
    this.numToLoad = 0;
    this.numLoadDone = 0;
    this.loadFail = null;
  }

  readImageData(filename, imgPlane, useAsync) {
    this.numToLoad++;
    if (useAsync) {
      fs.readFile(filename, (err, bytes) => {
        if (err) { console.log(err); return; }
        if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) {
          // NOTE: synchronous call
          this._loadJpegImage(bytes, imgPlane);
          this._imageHasLoaded(imgPlane);
          return;
        }
        if (filename.endsWith('.png')) {
          this._loadPngImageAsync(bytes, imgPlane, () => {
            this._imageHasLoaded(imgPlane);
          });
          return;
        }
      });
      return 1; // async
    }

    let bytes;
    try {
      bytes = fs.readFileSync(filename);
    } catch (err) {
      throw new Error(`image not found ${filename}`);
    }
    if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) {
      this._loadJpegImage(bytes, imgPlane);
      this._imageHasLoaded(imgPlane);
      return 0; // success
    }
    if (filename.endsWith('.png')) {
      this._loadPngImage(bytes, imgPlane);
      this._imageHasLoaded(imgPlane);
      return 0; // success
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

  saveTo(filename, surfList) {
    if (!Array.isArray(surfList)) {
      throw new Error(`type error, saveTo expects an Array of Surfaces`);
    }
    let surf = surfList[0];
    let image = {
      width: surf.width,
      height: surf.height,
      data: surf.buff,
    };
    let bytes = PNG.sync.write(image);
    fs.writeFileSync(filename, bytes);
  }

  _loadJpegImage(bytes, img) {
    var jpegObj = jpeg.decode(bytes, {useTArray: true});
    img.rgbBuff = jpegObj.data;
    img.width = jpegObj.width;
    img.height = jpegObj.height;
    img.pitch = jpegObj.width;
  }

  _loadPngImage(bytes, img) {
    let pngObj = PNG.sync.read(bytes);
    img.rgbBuff = pngObj.data;
    img.width = pngObj.width;
    img.height = pngObj.height;
    img.pitch = pngObj.width;
  }

  _loadPngImageAsync(bytes, img, callback) {
    let pngObj = new PNG();
    pngObj.write(bytes);
    pngObj.on('parsed', function() {
      img.rgbBuff = pngObj.data;
      img.width = pngObj.width;
      img.height = pngObj.height;
      img.pitch = pngObj.width;
      callback();
    });
    pngObj.on('error', function(err) {
      console.log(err);
      // TODO: callback
    });
  }

  _imageHasLoaded(img) {
    if (img.whenRead) {
      img.whenRead();
    }
    this.numLoadDone++;
  }

  whenLoaded(cb) {
    let self = this;
    function checkIfDone() {
      if (self.loadFail) {
        throw new Error(`image "${self.loadFail}" not found`);
      }
      if (self.numLoadDone == self.numToLoad) {
        return cb();
      }
      setImmediate(checkIfDone);
    }
    checkIfDone();
  }
}

module.exports.FilesysAccess = FilesysAccess;
