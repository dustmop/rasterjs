const put = require('./pixel_update_task.js');

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
}

Plane.prototype.setColor = function(color) {
  this.frontColor = color;
}

Plane.prototype.fillBackground = function(color) {
  this.backColor = color;
  this.needErase = true;
}

Plane.prototype.putDot = function(x, y) {
  this._prepare();
  let rgb = this.rgbMap[this.frontColor];
  let r = Math.floor(rgb / 0x10000) % 0x100;
  let g = Math.floor(rgb / 0x100) % 0x100;
  let b = Math.floor(rgb) % 0x100;
  let k = (y * this.rowSize + x) * 4;
  this.buffer[k+0] = r;
  this.buffer[k+1] = g;
  this.buffer[k+2] = b;
  this.buffer[k+3] = 0xff;
}

Plane.prototype.putLine = function(x0, y0, x1, y1, cc) {
  this._prepare();
  let rgb = this.rgbMap[this.frontColor];
  put.putLine(this, x0, y0, x1, y1, rgb, false)
}

Plane.prototype.putPolygon = function(baseX, baseY, points, fill) {
  this._prepare();
  let ps = [];
  for (let k = 0; k < points.length; k++) {
    ps.push({x: Math.floor(points[k][0] + baseX),
             y: Math.floor(points[k][1] + baseY)});
  }
  let rgb = this.rgbMap[this.frontColor];
  if (fill) {
    put.putPolygonFill(this, ps, rgb);
  } else {
    put.putPolygonOutline(this, ps, rgb);
  }
}

Plane.prototype._prepare = function() {
  if (this.buffer == null) {
    let width = this.width || 100;
    let height = this.height || 100;
    this.rowSize = width;
    let numElems = height * this.rowSize;
    let capacity = numElems * 4;
    this.buffer = new Uint8Array(capacity);
    this.numElems = numElems;
    this.needErase = true;
  }
  if (!this.needErase) {
    return;
  }
  // Background fill color
  let rgb = this.rgbMap[this.backColor];
  let r = Math.floor(rgb / 0x10000) % 0x100;
  let g = Math.floor(rgb / 0x100) % 0x100;
  let b = Math.floor(rgb) % 0x100;
  let h = this.height;
  let w = this.width;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let k = (y * w + x) * 4;
      this.buffer[k+0] = r;
      this.buffer[k+1] = g;
      this.buffer[k+2] = b;
      this.buffer[k+3] = 0xff;
    }
  }
  this.needErase = false;
}

module.exports.Plane = Plane;
