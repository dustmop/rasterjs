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
    // wait for the image to load
    this.numToLoad++;

    // html node for loading the Image
    let imgElem = new Image;
    imgElem.onload = () => {
      // get the pixel data and save it on the resource
      let canvas = document.createElement('canvas');
      canvas.width = imgElem.width;
      canvas.height = imgElem.height;
      let ctx = canvas.getContext('2d');
      ctx.drawImage(imgElem, 0, 0, imgElem.width, imgElem.height);
      let pixels = ctx.getImageData(0, 0, imgElem.width, imgElem.height);
      // assign to the imageField being opened
      imgField.rgbBuff = pixels.data;
      imgField.width = pixels.width;
      // TODO: Fix me
      imgField.pitch = pixels.width;
      imgField.height = pixels.height;
      // callback for when image loading, down-sample RGB to 8-bit values
      if (imgField.whenRead) {
        imgField.whenRead();
      }
      this.numLoadDone++;
    }
    // handle errors
    imgElem.onerror = () => {
      imgField.loadState = -1;
      this.loadFail = filename;
      this.numLoadDone++;
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
