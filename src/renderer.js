const rgbColor = require('./rgb_color.js');

function Renderer(colorSet) {
  this.colorSet = colorSet;
  this.rgbBuffer = null;
  return this;
}

Renderer.prototype.clear = function() {
  this.rgbBuffer = null;
}

Renderer.prototype.render = function(pl, tiles, palette, config) {
  let source = pl.data;
  let sourcePitch = pl.pitch;
  let sourceWidth = pl.width;
  let sourceHeight = pl.height;
  let targetWidth = pl.width;
  let targetHeight = pl.height;
  let targetPitch = pl.width*4;
  let numPoints = pl.height * pl.width;
  let sizeInfo = null;

  if (tiles != null) {
    // Assert that useTileset requires usePlane
    if (!config.usingNonPrimaryPlane) {
      throw new Error('cannot use tileset without also using plane');
    }
    // Calculate the size
    let tileSize = tiles.tileWidth * tiles.tileHeight;
    sourceWidth = pl.width * tiles.tileWidth;
    sourceHeight = pl.height * tiles.tileHeight;
    source = new Uint8Array(numPoints * tileSize);

    for (let yTile = 0; yTile < pl.height; yTile++) {
      for (let xTile = 0; xTile < pl.width; xTile++) {
        let k = yTile*pl.pitch + xTile;
        let c = pl.data[k];
        let t = tiles.get(c);
        if (t === undefined) {
          throw new Error(`invalid tile number ${c} at ${xTile},${yTile}`);
        }
        for (let i = 0; i < t.height; i++) {
          for (let j = 0; j < t.width; j++) {
            let y = yTile * tiles.tileHeight + i;
            let x = xTile * tiles.tileWidth + j;
            let n = y * sourceWidth + x;
            source[n] = t.get(j, i);
          }
        }
      }
    }

    sourcePitch = tiles.tileWidth * pl.width;
    targetPitch = sourcePitch*4;
    targetWidth = tiles.tileWidth * pl.width;
    targetHeight = tiles.tileHeight * pl.height;
    numPoints = numPoints * tileSize;
    sizeInfo = {};
    sizeInfo.width = tiles.tileWidth * pl.width;
    sizeInfo.height = tiles.tileHeight * pl.height;
    sizeInfo.pitch = targetPitch;
  }

  if (this.rgbBuffer == null) {
    this.rgbBuffer = new Uint8Array(numPoints*4);
  }

  let scrollY = Math.floor(config.scrollY || 0);
  let scrollX = Math.floor(config.scrollX || 0);
  scrollY = ((scrollY % sourceHeight) + sourceHeight) % sourceHeight;
  scrollX = ((scrollX % sourceWidth) + sourceWidth) % sourceWidth;

  this.palette = palette;

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
  if (config.width) {
    this.rgbBuffer.width = config.width;
    this.rgbBuffer.pitch = targetPitch;
  }
  if (config.height) {
    this.rgbBuffer.height = config.height;
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
