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

  readImageData(filename, imgPlane) {
    let self = this;

    // wait for the image to load
    this.numToLoad++;

    // html node for loading the Image
    let imgElem = new Image;
    imgElem.onload = function() {
      // get the pixel data and save it on the resource
      let canvas = document.createElement('canvas');
      canvas.width = imgElem.width;
      canvas.height = imgElem.height;
      let ctx = canvas.getContext('2d');
      ctx.drawImage(imgElem, 0, 0, imgElem.width, imgElem.height);
      let pixels = ctx.getImageData(0, 0, imgElem.width, imgElem.height);
      // assign to the imagePlane being opened
      imgPlane.rgbBuff = pixels.data;
      imgPlane.width = pixels.width;
      // TODO: Fix me
      imgPlane.pitch = pixels.width;
      imgPlane.height = pixels.height;
      // callback for when image loading, down-sample RGB to 8-bit values
      if (imgPlane.whenRead) {
        imgPlane.whenRead();
      }
      self.numLoadDone++;
    }
    // handle errors
    imgElem.onerror = function() {
      imgPlane.loadState = -1;
      self.loadFail = filename;
      self.numLoadDone++;
    }

    // allow cross origin image loading
    imgElem.crossOrigin = 'Anonymous';

    // artificially slow down image loading, used by tests
    if (filename.startsWith('SLOW:')) {
      setTimeout(() => {
        filename = filename.slice(5);
        imgElem.src = filename;
      }, 50);
      return 1;
    }
    imgElem.src = filename;
    return 1; // async
  }

  readText(filename) {
    let self = this;
    let file = {src: filename};
    self.numToLoad++;
    fetch(filename).then(function(res) {
      res.text().then(function(text) {
        file.handleFileRead(text);
        self.numLoadDone++;
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
