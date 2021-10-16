const colorSet = require('./color_set.js');
const rgbColor = require('./rgb_color.js');

function Scene(resources, env) {
  this.colorSet = new colorSet.Set();
  this.resources = resources;
  this.saveService = resources;
  this.env = env;
  this.font = null;
  this.rgbBuffer = null;
  this.palette = null;
  return this;
}

Scene.prototype.clearPlane = function(plane) {
  plane.clear();
  this.rgbBuffer = null;
}

Scene.prototype.render = function(pl) {
  let numPixels = pl.height * pl.pitch;
  if (this.rgbBuffer == null) {
    this.rgbBuffer = new Uint8Array(numPixels*4);
  }
  for (let y = 0; y < pl.height; y++) {
    for (let x = 0; x < pl.width; x++) {
      let k = y*pl.pitch + x;
      let rgb = this._toColor(pl.data[k]);
      this.rgbBuffer[k*4+0] = rgb.r;
      this.rgbBuffer[k*4+1] = rgb.g;
      this.rgbBuffer[k*4+2] = rgb.b;
      this.rgbBuffer[k*4+3] = 0xff;
    }
  }
  return this.rgbBuffer;
}

Scene.prototype._toColor = function(c) {
  let rgb;
  if (this.palette) {
    let ent = this.palette.get(c);
    if (!ent) {
      rgb = rgbColor.BLACK;
    } else {
      rgb = ent.rgb;
    }
  } else {
    rgb = this.colorSet.get(c);
  }
  rgbColor.ensureIs(rgb);
  return rgb
}

module.exports.Scene = Scene;
