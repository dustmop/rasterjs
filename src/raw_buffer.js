function RawBuffer() {
  return this;
}

RawBuffer.prototype.clear = function() {
  this._ = 'raw_buffer.js';
  this.frontColor = 7;
  this.backColor = 0;
  this.width = 0;
  this.height = 0;
  this.rgbMap = [];
  this.data = null;
  this._needErase = true;
}

RawBuffer.prototype.setSize = function(width, height) {
  this.width = width;
  this.height = height;
}

RawBuffer.prototype.assignRgbMap = function(rgbMap) {
  this.rgbMap = rgbMap;
}

RawBuffer.prototype.fillBackground = function(color) {
  this.backColor = color;
  this._needErase = true;
}

RawBuffer.prototype.setColor = function(color) {
  this.frontColor = color;
}

RawBuffer.prototype.putSequence = function(seq) {
  this._prepare();
  // Get the current color
  let [r,g,b] = this._toColor(this.frontColor);
  // Each sequence
  for (let i = 0; i < seq.length; i++) {
    let elem = seq[i];
    if (elem.length == 2) {
      // Sequence of length 2 is a single point
      let x = elem[0];
      let y = elem[1];
      let k = y * this.width + x;
      this.data[k*4+0] = r;
      this.data[k*4+1] = g;
      this.data[k*4+2] = b;
    } else if (elem.length == 4) {
      // Sequnce of length 4 is a range
      let x0 = elem[0];
      let x1 = elem[1];
      let y0 = elem[2];
      let y1 = elem[3];
      // Swap endpoints if needed
      if (x0 > x1) {
        let tmp = x0;
        x0 = x1;
        x1 = tmp;
      }
      if (y0 > y1) {
        let tmp = y0;
        y0 = y1;
        y1 = tmp;
      }
      // Range only goes straight horizontal or straight vertical
      if (x0 == x1) {
        let x = x0;
        for (let y = y0; y <= y1; y++) {
          let k = y * this.width + x;
          this.data[k*4+0] = r;
          this.data[k*4+1] = g;
          this.data[k*4+2] = b;
        }
      } else if (y0 == y1) {
        let y = y0;
        for (let x = x0; x <= x1; x++) {
          let k = y * this.width + x;
          this.data[k*4+0] = r;
          this.data[k*4+1] = g;
          this.data[k*4+2] = b;
        }
      }
    }
  }
}

RawBuffer.prototype.putImage = function(img, baseX, baseY) {
  this._prepare();
  let imageTop = img.top;
  let imageLeft = img.left;
  let imageHeight = img.height;
  let imageWidth = img.width;
  if (this.data == null) {
    return;
  }
  baseX = Math.floor(baseX);
  baseY = Math.floor(baseY);
  for (let y = imageTop; y < imageHeight; y++) {
    for (let x = imageLeft; x < imageWidth; x++) {
      let j = y*imageWidth + x;
      let putX = x + baseX;
      let putY = y + baseY;
      if (putX < 0 || putX >= this.width ||
          putY < 0 || putY >= this.height) {
        continue;
      }
      let k = putY*this.width + putX;
      let alpha = img.data[j*4+3];
      if (alpha < 0x80) {
        continue;
      }
      this.data[k*4+0] = img.data[j*4+0];
      this.data[k*4+1] = img.data[j*4+1];
      this.data[k*4+2] = img.data[j*4+2];
      this.data[k*4+3] = 0xff;
    }
  }
}

RawBuffer.prototype.putFrameMemory = function(mem) {
  this._prepare();
  for (let y = 0; y < mem.height; y++) {
    for (let x = 0; x < mem.width; x++) {
      let k = y * this.width + x;
      let v = mem[k];
      let [r,g,b] = this._toColor(mem[k]);
      this.data[k*4+0] = r;
      this.data[k*4+1] = g;
      this.data[k*4+2] = b;
    }
  }
}

RawBuffer.prototype._prepare = function() {
  if (this.data && !this._needErase) {
    return;
  }
  let numPixels = this.height * this.width;
  let [r,g,b] = this._toColor(this.backColor);
  if (!this.data) {
    this.data = new Uint8Array(numPixels*4);
    this._needErase = true;
  }
  for (let k = 0; k < numPixels; k++) {
    this.data[k*4+0] = r;
    this.data[k*4+1] = g;
    this.data[k*4+2] = b;
    this.data[k*4+3] = 0xff;
  }
  this._needErase = false;
}

RawBuffer.prototype.rawData = function() {
  return this.data;
}

RawBuffer.prototype._toColor = function(color) {
  let rgb = this.rgbMap[color];
  let r = (rgb / 0x10000) % 0x100;
  let g = (rgb / 0x100) % 0x100;
  let b = (rgb / 0x1) % 0x100;
  return [r, g, b];
}

module.exports.RawBuffer = RawBuffer;
