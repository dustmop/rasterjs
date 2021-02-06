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
  this._prepare();
/*
  // TODO: Line drawing algorithm.
  let k = (x0 + y0 * this.width) * 4;
  this.buffer[k+0] = 0;
  this.buffer[k+1] = 0;
  this.buffer[k+2] = 0;
  this.buffer[k+3] = 0xff;
  k = (x1 + y1 * this.width) * 4;
  this.buffer[k+0] = 0;
  this.buffer[k+1] = 0;
  this.buffer[k+2] = 0;
  this.buffer[k+3] = 0xff;
*/
  put.putLine(this, x0, y0, x1, y1, 0xffffffff, false)
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
  // TODO real thing
  let h = this.height;
  let w = this.width;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let k = (y * w + x) * 4;
      this.buffer[k+0] = Math.floor(255 * x/w);
      this.buffer[k+1] = Math.floor(255 * 0.5 * ((1.0 - y/h) + (1.0 - x/w)));
      this.buffer[k+2] = Math.floor(255 * y/h);
      this.buffer[k+3] = 0xff;
    }
  }

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let k = (y * w + x) * 4;
      let r = this.buffer[k+0];
      let g = this.buffer[k+1];
      let b = this.buffer[k+2];
      let a = this.buffer[k+3];
      //console.log(`${y},${x}: ${r},${g},${b}`);
    }
  }

  this.needErase = false;
}

module.exports.Plane = Plane;
