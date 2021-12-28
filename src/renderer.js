const rgbColor = require('./rgb_color.js');

function Renderer() {
  this.rgbBuffer = null;
  this.plane = null;
  this.tiles = null;
  this.colorSet = null;
  this.palette = null;
  this.attrs = null;
  this.interrupts = null;
  this.config = null;
  return this;
}

Renderer.prototype.clear = function() {
  this.rgbBuffer = null;
  this.tiles = null;
  this.colorSet = null;
  this.palette = null;
  this.attrs = null;
  this.interrupts = null;
  this.config = null;
}

Renderer.prototype.configure = function(owner) {
  this.tiles = owner.tiles;
  this.colorSet = owner.colorSet;
  this.palette = owner.palette;
  this.attrs = owner.attrs;
  this.interrupts = owner.interrupts;
  this.config = owner._config;
}

Renderer.prototype.size = function () {
  let width = this.config.width;
  let height = this.config.height;
  if (!width) {
    if (this.tiles) {
      width = this.plane.width * this.tiles.tileWidth;
    } else {
      width = this.plane.width;
    }
  }
  if (!height) {
    if (this.tiles) {
      height = this.plane.height * this.tiles.tileHeight;
    } else {
      height = this.plane.height;
    }
  }
  return [width, height];
}

Renderer.prototype.render = function() {
  // Calculate size of the buffer to render.
  let width = this.config.width;
  let height = this.config.height;
  if (!width || !height) {
    if (!this.tiles) {
      width = this.plane.width;
      height = this.plane.height;
    } else {
      width = this.plane.width * this.tiles.tileWidth;
      height = this.plane.height * this.tiles.tileHeight;
    }
  }

  // Allocate the buffer.
  if (this.rgbBuffer == null) {
    let numPoints = width * height;
    this.rgbBuffer = new Uint8Array(numPoints*4);
    this.rgbBuffer.pitch = width*4;
  }
  if (!this.plane.data) {
    return this.rgbBuffer;
  }

  // If no interrupts, render everything at once.
  if (!this.interrupts) {
    return this._renderRegion(0, 0, width, height);
  }

  // Otherwise, render between each interrupt.
  let renderPoint = 0;
  for (let k = 0; k < this.interrupts.length + 1; k++) {
    let scanLine;
    if (k < this.interrupts.length) {
      scanLine = Math.min(this.interrupts[k].scanline, height);
    } else {
      scanLine = height;
    }
    this._renderRegion(0, renderPoint, width, scanLine);
    renderPoint = scanLine;
    if (k < this.interrupts.length) {
      this.interrupts[k].irq();
    }
  }

  return this.rgbBuffer;
}

Renderer.prototype._renderRegion = function(left, top, right, bottom) {
  let source = this.plane.data;
  let sourcePitch = this.plane.pitch;
  let sourceWidth = this.plane.width;
  let sourceHeight = this.plane.height;

  if (this.tiles != null) {
    // Assert that useTileset requires usePlane
    if (!this.config.usingNonPrimaryPlane) {
      throw new Error('cannot use tileset without also using plane');
    }
    // Calculate the size
    let tileSize = this.tiles.tileWidth * this.tiles.tileHeight;
    let numPoints = this.plane.height * this.plane.width;
    sourceWidth = this.plane.width * this.tiles.tileWidth;
    sourceHeight = this.plane.height * this.tiles.tileHeight;
    sourcePitch = this.tiles.tileWidth * this.plane.width;
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
  }

  let targetPitch = this.rgbBuffer.pitch;

  let scrollY = Math.floor(this.config.scrollY || 0);
  let scrollX = Math.floor(this.config.scrollX || 0);
  scrollY = ((scrollY % sourceHeight) + sourceHeight) % sourceHeight;
  scrollX = ((scrollX % sourceWidth) + sourceWidth) % sourceWidth;

  for (let placement = 0; placement < 4; placement++) {
    let regL, regR, regU, regD;
    if ((placement == 0) || (placement == 2)) {
      // left half
      regL = scrollX;
      regR = Math.min(sourceWidth, right + scrollX);
    } else {
      // right half
      regL = 0;
      regR = scrollX - sourceWidth + right;
    }

    if ((placement == 0) || (placement == 1)) {
      // top half
      regU = Math.max(scrollY, top + scrollY);
      regD = Math.min(sourceHeight, bottom + scrollY);
    } else {
      // bottom half
      regU = Math.max(scrollY - sourceHeight + top, 0);
      regD = scrollY - sourceHeight + bottom;
    }

    for (let y = regU; y < regD; y++) {
      for (let x = regL; x < regR; x++) {
        let i, j;
        if (placement == 0) {
          i = y - scrollY;
          j = x - scrollX;
        } else if (placement == 1) {
          i = y - scrollY;
          j = x - scrollX + sourceWidth;
        } else if (placement == 2) {
          i = y - scrollY + sourceHeight;
          j = x - scrollX;
        } else if (placement == 3) {
          i = y - scrollY + sourceHeight;
          j = x - scrollX + sourceWidth;
        } else {
          continue;
        }
        if (i < top || i >= bottom || j < left || j >= right) {
          // TODO: should never happen
          continue;
        }
        let s = y*sourcePitch + x;
        let t = i*targetPitch + j*4;
        let rgb;
        if (this.attrs) {
          let c = this.attrs.realizeIndexedColor(source[s], x, y);
          rgb = this._toColor(c);
        } else {
          rgb = this._toColor(source[s]);
        }
        this.rgbBuffer[t+0] = rgb.r;
        this.rgbBuffer[t+1] = rgb.g;
        this.rgbBuffer[t+2] = rgb.b;
        this.rgbBuffer[t+3] = 0xff;
      }
    }
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
