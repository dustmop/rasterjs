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
  this.tiles = null;
  return this;
}

Scene.prototype.clearPlane = function(plane) {
  plane.clear();
  this.rgbBuffer = null;
}

Scene.prototype.render = function(pl) {
  //
  let source = pl.data;
  let numPoints = pl.height * pl.pitch;

  if (this.tiles != null) {
    // TODO: pl.width?
    let targetPitch = this.tiles.tileWidth * pl.width;
    let tileSize = this.tiles.tileWidth * this.tiles.tileHeight;
    if (this.rgbBuffer == null) {
      this.rgbBuffer = new Uint8Array(numPoints * tileSize * 4);
    }

    for (let yTile = 0; yTile < pl.height; yTile++) {
      for (let xTile = 0; xTile < pl.width; xTile++) {
        let k = yTile*pl.pitch + xTile;
        let c = pl.data[k];
        let t = this.tiles.get(c);
        for (let i = 0; i < t.height; i++) {
          for (let j = 0; j < t.width; j++) {
            let y = yTile * this.tiles.tileHeight + i;
            let x = xTile * this.tiles.tileWidth + j;
            let n = y * targetPitch + x;
            let [r,g,b] = t.getRGB(j, i);
            this.rgbBuffer[n*4+0] = r;
            this.rgbBuffer[n*4+1] = g;
            this.rgbBuffer[n*4+2] = b;
            this.rgbBuffer[n*4+3] = 0xff;
          }
        }
      }
    }
    this.rgbBuffer.width = this.tiles.tileWidth * pl.width;
    this.rgbBuffer.height = this.tiles.tileHeight * pl.height;
    this.rgbBuffer.pitch = 4 * this.tiles.tileWidth * pl.width;
    return this.rgbBuffer;
  }

  if (this.rgbBuffer == null) {
    this.rgbBuffer = new Uint8Array(numPoints*4);
  }
  for (let y = 0; y < pl.height; y++) {
    for (let x = 0; x < pl.width; x++) {
      let k = y*pl.pitch + x;
      let rgb = this._toColor(source[k]);
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
