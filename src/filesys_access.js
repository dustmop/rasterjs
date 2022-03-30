function FilesysAccess() {
  this.numToLoad = 0;
  this.numLoadDone = 0;
  // TODO: Don't need this
  this.addedFiles = {};
  return this;
}

FilesysAccess.prototype.openImage = function(filename, imgPlane) {
  let self = this;

  // Wait for the image to load
  this.numToLoad++;

  if (this.addedFiles[filename]) {
    let imgsurf = this.addedFiles[filename];
    imgPlane.rgbBuff = imgsurf.buff;
    imgPlane.width = imgsurf.width;
    // TODO: Fix me
    imgPlane.pitch = imgsurf.width;
    imgPlane.height = imgsurf.height;
    self.numLoadDone++;
    imgPlane.fillData();
    return 1;
  }

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
    imgPlane.fillData();
    self.numLoadDone++;
  }
  // TODO: Handle 404 not found for images
  imgElem.src = '/' + filename;
}

// TODO: don't do this on FilesysAccess
FilesysAccess.prototype.insert = function(filename, imgsurf) {
  this.addedFiles[filename] = imgsurf;
}

FilesysAccess.prototype.openText = function(filename) {
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

FilesysAccess.prototype.localAsset = function(relpath) {
  throw new Error('cannot get local assets');
}

FilesysAccess.prototype.whenLoaded = function(cb) {
  let self = this;
  function checkIfDone() {
    if (self.numLoadDone == self.numToLoad) {
      return cb();
    }
    setTimeout(checkIfDone, 100);
  }
  checkIfDone();
}

FilesysAccess.prototype.saveTo = function() {
  throw new Error('cannot save image');
}

module.exports.FilesysAccess = FilesysAccess;
