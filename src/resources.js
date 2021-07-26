function Resources() {
  this.numToLoad = 0;
  this.numLoadDone = 0;
  return this;
}

Resources.prototype.openImage = function(filename, imgPlane) {
  let self = this;
  // The html node for loading the Image.
  let imgElem = new Image;
  imgPlane.elemNode = imgElem;

  // Wait for the image to load
  this.numToLoad++;
  imgElem.onload = function() {
    // Get the pixel data and save it on the resource.
    let canvas = document.createElement('canvas');
    canvas.width = imgElem.width;
    canvas.height = imgElem.height;
    let ctx = canvas.getContext('2d');
    ctx.drawImage(imgElem, 0, 0, imgElem.width, imgElem.height);
    let pixels = ctx.getImageData(0, 0, imgElem.width, imgElem.height);
    imgPlane.data = pixels.data;
    imgPlane.width = pixels.width;
    imgPlane.height = pixels.height;
    // TODO: Process the pixel data so it matches the colorSet
    // Mark the load as completed.
    self.numLoadDone++;
  }
  // TODO: Handle 404 not found for images
  imgElem.src = '/' + filename;
}

Resources.prototype.allImagesLoaded = function() {
  return this.numLoadDone == this.numToLoad;
}

module.exports.Resources = Resources;
