const colors = require('./color_set.js');

function Standalone() {
  this.colorSet = new colors.Set([]);
  this.rgbBuffer = null;
  this.palette = null;
  this.saveService = null;
  return this;
}

Standalone.prototype.render = function(pl) {
  let numPixels = pl.height * pl.pitch;
  if (this.rgbBuffer == null) {
    this.rgbBuffer = new Uint8Array(numPixels*4);
  }
  for (let y = 0; y < pl.height; y++) {
    for (let x = 0; x < pl.width; x++) {
      let k = y*pl.pitch + x;
      let [r,g,b] = this._toColor(pl.data[k]);
      this.rgbBuffer[k*4+0] = r;
      this.rgbBuffer[k*4+1] = g;
      this.rgbBuffer[k*4+2] = b;
      this.rgbBuffer[k*4+3] = 0xff;
    }
  }
  return this.rgbBuffer;
}

Standalone.prototype._toColor = function(c) {
  let rgb;
  if (this.palette) {
    let ent = this.palette.get(c);
    if (!ent) {
      console.log(`color not found: ${c}`);
    }
    rgb = ent.rgb.toInt();
  } else {
    rgb = this.colorSet.get(c);
  }
  let r = Math.floor(rgb / 0x10000) % 0x100;
  let g = Math.floor(rgb / 0x100) % 0x100;
  let b = Math.floor(rgb / 0x1) % 0x100;
  return [r, g, b];
}

module.exports.Standalone = Standalone;
