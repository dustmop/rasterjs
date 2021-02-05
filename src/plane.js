function Plane() {
  this.rgbMap = null;
  this.width = 0;
  this.height = 0;
  this.frontColor = 0xffffff;
  this.backColor = 0x0;
  this.buffer = null;
  return this;
}

Plane.prototype.clear = function() {
  this.width = 0;
  this.height = 0;
  this.buffer = null;
}

Plane.prototype.assignRgbMap = function(rgbMap) {
  this.rgbMap = rgbMap;
}

Plane.prototype.setSize = function(width, height) {
  // TODO: destructure
  this.width = width;
  this.height = height;
  console.log(`setSize, width=${this.width} height=${this.height}`);
}

Plane.prototype.setColor = function(color) {
  this.frontColor = color;
}

Plane.prototype.fillBackground = function(color) {
  this.backColor = color;
  this.needErase = true;
}

Plane.prototype.putLine = function(x0, y0, x1, y1, c) {
  // TODO
  //this._maybeAllocate();
}


module.exports.Plane = Plane;
