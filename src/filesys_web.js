function FilesysAccess() {
  this.clear();
  return this;
}

FilesysAccess.prototype.clear = function() {
  this.numToLoad = 0;
  this.numLoadDone = 0;
  this.loadFail = null;
}

FilesysAccess.prototype.readImageData = function(filename, imgPlane) {
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
    if (imgPlane.fillData) {
      imgPlane.fillData();
    }
    self.numLoadDone++;
  }
  imgElem.onerror = function() {
    self.loadFail = filename;
    self.numLoadDone++;
  }
  imgElem.src = '/' + filename;
  return 1;
}

FilesysAccess.prototype.readText = function(filename) {
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

FilesysAccess.prototype.saveTo = function() {
  throw new Error('cannot save image');
}

FilesysAccess.prototype.whenLoaded = function(cb) {
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

module.exports.FilesysAccess = FilesysAccess;
