const colorSet = require('./color_set.js');

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
      let [r,g,b] = this._toColor(pl.data[k]);
      this.rgbBuffer[k*4+0] = r;
      this.rgbBuffer[k*4+1] = g;
      this.rgbBuffer[k*4+2] = b;
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
      rgb = 0;
    } else {
      rgb = ent.rgb.toInt();
    }
  } else {
    rgb = this.colorSet.get(c);
  }
  let r = Math.floor(rgb / 0x10000) % 0x100;
  let g = Math.floor(rgb / 0x100) % 0x100;
  let b = Math.floor(rgb / 0x1) % 0x100;
  return [r, g, b];
}

module.exports.Scene = Scene;
