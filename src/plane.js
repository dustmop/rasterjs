function Plane() {
  this.rgbMap = null;
  return this;
}

Plane.prototype.assignRgbMap = function(rgbMap) {
  this.rgbMap = rgbMap;
}

Plane.prototype.setSize = function(obj) {
  // TODO: destructure
  this.width = obj.w;
  this.height = obj.h;
}

Plane.prototype.setColor = function(color) {
  this.color = color;
}

Plane.prototype.fillBackground = function(color) {
  this.bgColor = color;
  this.needErase = true;
}

Plane.prototype.putLine = function(x0, y0, x1, y1, c) {
  // TODO
}


module.exports.Plane = Plane;
