const colors = require('./color_set.js');
const rgbColor = require('./rgb_color.js');

function Standalone() {
  this.colorSet = new colors.Set([]);
  this.rgbBuffer = null;
  this.palette = null;
  this.saveService = null;
  return this;
}

Standalone.prototype.render = function(pl) {
  let targetPitch = pl.width*4;
  let numPoints = pl.height * targetPitch;
  if (this.rgbBuffer == null) {
    this.rgbBuffer = new Uint8Array(numPoints*4);
  }
  for (let y = 0; y < pl.height; y++) {
    for (let x = 0; x < pl.width; x++) {
      let k = y*pl.pitch + x;
      let j = y*targetPitch + x*4;
      let rgb = this._toColor(pl.data[k]);
      this.rgbBuffer[j+0] = rgb.r;
      this.rgbBuffer[j+1] = rgb.g;
      this.rgbBuffer[j+2] = rgb.b;
      this.rgbBuffer[j+3] = 0xff;
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
    rgb = ent.rgb;
  } else {
    rgb = this.colorSet.get(c);
  }
  rgbColor.ensureIs(rgb);
  return rgb;
}

module.exports.Standalone = Standalone;
