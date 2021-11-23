const rgbColor = require('./rgb_color.js');

function Renderer() {
  this.rgbBuffer = null;
  this.plane = null;
  this.tiles = null;
  this.colorSet = null;
  this.palette = null;
  this.config = null;
  this.width = null;
  this.height = null;
  return this;
}

Renderer.prototype.clear = function() {
  this.rgbBuffer = null;
  this.tiles = null;
  this.colorSet = null;
  this.palette = null;
  this.config = null;
  this.width = null;
  this.height = null;
}

Renderer.prototype.configure = function(owner) {
  this.tiles = owner.tiles;
  this.colorSet = owner.colorSet;
  this.palette = owner.palette;
  this.config = owner._config;
}

Renderer.prototype.setSize = function(x, y) {
  this.width = x;
  this.height = y;
}

Renderer.prototype.render = function() {
  let source = this.plane.data;
  let sourcePitch = this.plane.pitch;
  let sourceWidth = this.plane.width;
  let sourceHeight = this.plane.height;
  let targetWidth = this.plane.width;
  let targetHeight = this.plane.height;
  let targetPitch = this.plane.width*4;
  let numPoints = this.plane.height * this.plane.width;
  let sizeInfo = null;

  if (this.tiles != null) {
    // Assert that useTileset requires usePlane
    if (!this.config.usingNonPrimaryPlane) {
      throw new Error('cannot use tileset without also using plane');
    }
    // Calculate the size
    let tileSize = this.tiles.tileWidth * this.tiles.tileHeight;
    sourceWidth = this.plane.width * this.tiles.tileWidth;
    sourceHeight = this.plane.height * this.tiles.tileHeight;
    source = new Uint8Array(numPoints * tileSize);

    for (let yTile = 0; yTile < this.plane.height; yTile++) {
      for (let xTile = 0; xTile < this.plane.width; xTile++) {
        let k = yTile*this.plane.pitch + xTile;
        let c = this.plane.data[k];
        let t = this.tiles.get(c);
        if (t === undefined) {
          throw new Error(`invalid tile number ${c} at ${xTile},${yTile}`);
        }
        for (let i = 0; i < t.height; i++) {
          for (let j = 0; j < t.width; j++) {
            let y = yTile * this.tiles.tileHeight + i;
            let x = xTile * this.tiles.tileWidth + j;
            let n = y * sourceWidth + x;
            source[n] = t.get(j, i);
          }
        }
      }
    }

    sourcePitch = this.tiles.tileWidth * this.plane.width;
    targetPitch = sourcePitch*4;
    targetWidth = this.tiles.tileWidth * this.plane.width;
    targetHeight = this.tiles.tileHeight * this.plane.height;
    numPoints = numPoints * tileSize;
    sizeInfo = {};
    sizeInfo.width = this.tiles.tileWidth * this.plane.width;
    sizeInfo.height = this.tiles.tileHeight * this.plane.height;
    sizeInfo.pitch = targetPitch;
  }

  if (this.width) {
    targetWidth = this.width;
  }
  if (this.height) {
    targetHeight = this.height;
  }
  numPoints = targetHeight * targetWidth;
  targetPitch = targetWidth*4;

  if (this.rgbBuffer == null) {
    this.rgbBuffer = new Uint8Array(numPoints*4);
  }
  if (!source) {
    return this.rgbBuffer;
  }

  let scrollY = Math.floor(this.config.scrollY || 0);
  let scrollX = Math.floor(this.config.scrollX || 0);
  scrollY = ((scrollY % sourceHeight) + sourceHeight) % sourceHeight;
  scrollX = ((scrollX % sourceWidth) + sourceWidth) % sourceWidth;

  for (let attempt = 0; attempt < 4; attempt++) {
    for (let y = 0; y < sourceHeight; y++) {
      for (let x = 0; x < sourceWidth; x++) {
        let i, j;
        if (attempt == 0) {
          i = y - scrollY;
          j = x - scrollX;
        } else if (attempt == 1) {
          i = y - scrollY;
          j = x - scrollX + sourceWidth;
        } else if (attempt == 2) {
          i = y - scrollY + sourceHeight;
          j = x - scrollX;
        } else if (attempt == 3) {
          i = y - scrollY + sourceHeight;
          j = x - scrollX + sourceWidth;
        } else {
          continue;
        }
        if (i < 0 || i >= targetHeight || j < 0 || j >= targetWidth) {
          continue;
        }
        let s = y*sourcePitch + x;
        let t = i*targetPitch + j*4;
        let rgb = this._toColor(source[s]);
        this.rgbBuffer[t+0] = rgb.r;
        this.rgbBuffer[t+1] = rgb.g;
        this.rgbBuffer[t+2] = rgb.b;
        this.rgbBuffer[t+3] = 0xff;
      }
    }
  }

  if (sizeInfo) {
    this.rgbBuffer.width = sizeInfo.width;
    this.rgbBuffer.height = sizeInfo.height;
    this.rgbBuffer.pitch = sizeInfo.pitch;
  }
  if (this.config.width) {
    this.rgbBuffer.width = this.config.width;
  }
  this.rgbBuffer.pitch = targetPitch;
  if (this.config.height) {
    this.rgbBuffer.height = this.config.height;
  }
  return this.rgbBuffer;
}

Renderer.prototype._toColor = function(c) {
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

module.exports.Renderer = Renderer;
