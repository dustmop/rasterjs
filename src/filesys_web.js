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

    // Wait for the image to load
    this.numToLoad++;

    // The html node for loading the Image.
    let imgElem = new Image;
    imgElem.onload = function() {
      // Get the pixel data and save it on the resource.
      let canvas = document.createElement('canvas');
      canvas.width = imgElem.width;
      canvas.height = imgElem.height;
      let ctx = canvas.getContext('2d');
      ctx.drawImage(imgElem, 0, 0, imgElem.width, imgElem.height);
      let pixels = ctx.getImageData(0, 0, imgElem.width, imgElem.height);
      // Assign to the imagePlane being opened
      imgPlane.rgbBuff = pixels.data;
      imgPlane.width = pixels.width;
      // TODO: Fix me
      imgPlane.pitch = pixels.width;
      imgPlane.height = pixels.height;
      // Down-sample the rgb buffer into the data, then finish
      if (imgPlane.whenRead) {
        imgPlane.whenRead();
      }
      self.numLoadDone++;
    }
    imgElem.onerror = function() {
      imgPlane.loadState = -1;
      self.loadFail = filename;
      self.numLoadDone++;
    }

    if (filename.startsWith('SLOW:')) {
      setTimeout(() => {
        filename = filename.slice(5);
        imgElem.src = '/' + filename;
      }, 50);
      return 1;
    }
    imgElem.src = '/' + filename;
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
    throw new Error('cannot save image');
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
