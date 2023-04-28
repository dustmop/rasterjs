const PNG = require('pngjs/browser').PNG;
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

  readImageData(filename, imgField) {
    // artificially slow down image loading, used by tests
    if (filename.startsWith('SLOW:')) {
      setTimeout(() => {
        let filenameWithoutPrefix = filename.slice(5);
        this.readImageData(filenameWithoutPrefix, imgField);
      }, 50);
      return 1;
    }

    // wait for the image to load
    this.numToLoad++;
    if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) {
      this._readImageJpg(filename, imgField);
      return 1;
    }
    if (filename.endsWith('.png')) {
      this._readImagePng(filename, imgField);
      return 1;
    }
    let ext = filename.substring(filename.length - 4);
    throw new Error(`unknown filetype ${ext}`);
  }

  _readImageJpg(filename, imgField) {
    fetch(filename).then(res => res.blob()).then(blob => {
      blob.arrayBuffer().then(bytes => {
        let parsedJpeg = jpeg.decode(bytes, {useTArray: true});
        imgField.rgbBuff =  parsedJpeg.data;
        imgField.width = parsedJpeg.width;
        imgField.height = parsedJpeg.height;
        imgField.pitch = parsedJpeg.height;
        // callback for when image loading, down-sample RGB to 8-bit values
        if (imgField.whenRead) {
          imgField.whenRead();
        }
        this.numLoadDone++;
      });
    });
  };

  _readImagePng(filename, imgField) {
    fetch(filename).then(res => res.blob()).then(blob => {
      blob.arrayBuffer().then(bytes => {
        let parser = new PNG().parse(bytes, (err, pngImg) => {
          imgField.rgbBuff = pngImg.data;
          imgField.width = pngImg.width;
          imgField.pitch = pngImg.width;
          imgField.height = pngImg.height;
          // callback for when image loading, down-sample RGB to 8-bit values
          if (imgField.whenRead) {
            imgField.whenRead();
          }
          this.numLoadDone++;
        });
      });
    });

    return 1; // async
  }

  readText(filename) {
    let file = {src: filename};
    this.numToLoad++;
    fetch(filename).then((res) => {
      res.text().then((text) => {
        file.handleFileRead(text);
        this.numLoadDone++;
      });
    });
    return file;
  }

  saveTo() {
    console.log('(image saving not supported)');
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
      setTimeout(checkIfDone, 100);
    }
    checkIfDone();
  }
}

module.exports.FilesysAccess = FilesysAccess;
