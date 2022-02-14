const rgbColor = require('./rgb_color.js');
const plane = require('./plane.js');
const colorSet = require('./color_set.js');
const tiles = require('./tiles.js');
const palette = require('./palette.js');
const attrs = require('./attributes.js');

function Renderer() {
  this._init();
  return this;
}

Renderer.prototype.clear = function() {
  this._init();
}

Renderer.prototype._init = function() {
  this._layers = [
    {
      rgbSurface: null,
      plane: null,
      colorSet: null,
      tiles: null,
      palette: null,
      attrs: null,
      conf: null,
    }
  ]
  this.interrupts = null;
}

Renderer.prototype.connect = function(input) {
  let layer = this._layers[0];
  let allow = ['plane', 'colorSet', 'tiles', 'palette', 'attrs', 'conf',
               'interrupts', '_config', 'font'];
  let keys = Object.keys(input);
  for (let i = 0; i < keys.length; i++) {
    let k = keys[i];
    if (!allow.includes(k)) {
      throw new Error(`connect param has unrecognized key "${k}"`);
    }
  }

  if (!input.plane || input.plane.constructor != plane.Plane) {
    throw new Error(`input.plane must be a non-null Plane`);
  }
  if (!input.colorSet || input.colorSet.constructor != colorSet.Set) {
    throw new Error(`input.colorSet must be a non-null colorSet`);
  }
  if (input.tiles && input.tiles.constructor != tiles.Tileset) {
    throw new Error(`input.tiles must be a Tileset, got ${input.tiles}`);
  }
  if (input.palette && input.palette.constructor != palette.PaletteCollection) {
    throw new Error(`input.palette must be a Palette, got ${input.palette}`);
  }
  if (input.attrs && input.attrs.constructor != attrs.Attributes) {
    throw new Error(`input.attrs must be a Attributes`);
  }
  if (!input.conf) { // TODO: mustHaveKeys([width, height, scroll{X,Y}, ...])
    throw new Error(`input.conf must be non-null`);
  }
  if (input.interrupts && !Array.isArray(input.interrupts)) {
    throw new Error(`input.interrupts must be an array`);
  }

  layer.plane    = input.plane;
  // TODO: colorSet should be 'global'
  layer.colorSet = input.colorSet;
  layer.tiles    = input.tiles;
  layer.palette  = input.palette;
  layer.attrs    = input.attrs;
  layer.conf     = input.conf;
  this.interrupts = input.interrupts;
}

Renderer.prototype.flushBuffer = function() {
  let layer = this._layers[0];
  layer.rgbSurface = null;
}

Renderer.prototype.getFirstPlane = function() {
  return this._layers[0].plane;
}

Renderer.prototype.switchComponent = function(layerNum, compName, obj) {
  if (compName != 'tiles') {
    throw new Error(`switchComponent can only be used for "tiles"`);
  }
  this._layers[layerNum].tiles = obj;
}

Renderer.prototype.size = function () {
  let layer = this._layers[0];
  let width = layer.conf.width;
  let height = layer.conf.height;
  if (!width) {
    if (layer.tiles) {
      width = layer.plane.width * layer.tiles.tileWidth;
    } else {
      width = layer.plane.width;
    }
  }
  if (!height) {
    if (layer.tiles) {
      height = layer.plane.height * layer.tiles.tileHeight;
    } else {
      height = layer.plane.height;
    }
  }
  return [width, height];
}

Renderer.prototype.render = function() {
  let system = this;
  let layer = this._layers[0];

  // Calculate size of the buffer to render.
  let width = layer.conf.width;
  let height = layer.conf.height;
  if (!width || !height) {
    if (!layer.tiles) {
      width = layer.plane.width;
      height = layer.plane.height;
    } else {
      width = layer.plane.width * layer.tiles.tileWidth;
      height = layer.plane.height * layer.tiles.tileHeight;
    }
  }

  // Allocate the buffer.
  if (layer.rgbSurface == null) {
    let numPoints = width * height;
    layer.rgbSurface = {};
    layer.rgbSurface.width = width;
    layer.rgbSurface.height = height;
    layer.rgbSurface.buff = new Uint8Array(numPoints*4);
    layer.rgbSurface.pitch = width*4;
  }

  // If plane has not been rendered yet, do so now.
  layer.plane.ensureReady();

  // If no interrupts, render everything at once.
  if (!system.interrupts) {
    return [this._renderRegion(0, 0, width, height)];
  }

  // Otherwise, render between each interrupt.
  let renderPoint = 0;
  for (let k = 0; k < system.interrupts.length + 1; k++) {
    let scanLine;
    if (k < system.interrupts.length) {
      scanLine = Math.min(system.interrupts[k].scanline, height);
    } else {
      scanLine = height;
    }
    this._renderRegion(0, renderPoint, width, scanLine);
    renderPoint = scanLine;
    if (k < system.interrupts.length) {
      system.interrupts[k].irq();
    }
  }

  return [layer.rgbSurface];
}

Renderer.prototype._renderRegion = function(left, top, right, bottom) {
  let layer = this._layers[0];

  let source = layer.plane.data;
  let sourcePitch = layer.plane.pitch;
  let sourceWidth = layer.plane.width;
  let sourceHeight = layer.plane.height;

  if (layer.tiles != null) {
    // Assert that useTileset requires usePlane
    if (!layer.conf.usingNonPrimaryPlane) {
      throw new Error('cannot use tileset without also using plane');
    }
    // Calculate the size
    let tileSize = layer.tiles.tileWidth * layer.tiles.tileHeight;
    let numPoints = layer.plane.height * layer.plane.width;
    sourceWidth = layer.plane.width * layer.tiles.tileWidth;
    sourceHeight = layer.plane.height * layer.tiles.tileHeight;
    sourcePitch = layer.tiles.tileWidth * layer.plane.width;
    source = new Uint8Array(numPoints * tileSize);

    for (let yTile = 0; yTile < layer.plane.height; yTile++) {
      for (let xTile = 0; xTile < layer.plane.width; xTile++) {
        let k = yTile*layer.plane.pitch + xTile;
        let c = layer.plane.data[k];
        let t = layer.tiles.get(c);
        if (t === undefined) {
          throw new Error(`invalid tile number ${c} at ${xTile},${yTile}`);
        }
        for (let i = 0; i < t.height; i++) {
          for (let j = 0; j < t.width; j++) {
            let y = yTile * layer.tiles.tileHeight + i;
            let x = xTile * layer.tiles.tileWidth + j;
            let n = y * sourceWidth + x;
            source[n] = t.get(j, i);
          }
        }
      }
    }
  }

  let targetPitch = layer.rgbSurface.pitch;

  let scrollY = Math.floor(layer.conf.scrollY || 0);
  let scrollX = Math.floor(layer.conf.scrollX || 0);
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
        if (layer.attrs) {
          let c = layer.attrs.realizeIndexedColor(source[s], x, y);
          rgb = this._toColor(c);
        } else {
          rgb = this._toColor(source[s]);
        }
        layer.rgbSurface.buff[t+0] = rgb.r;
        layer.rgbSurface.buff[t+1] = rgb.g;
        layer.rgbSurface.buff[t+2] = rgb.b;
        layer.rgbSurface.buff[t+3] = 0xff;
      }
    }
  }

  return layer.rgbSurface;
}

Renderer.prototype._toColor = function(c) {
  let layer = this._layers[0];
  let rgb;
  if (layer.palette) {
    let ent = layer.palette.get(c);
    if (!ent) {
      rgb = rgbColor.BLACK;
    } else {
      rgb = ent.rgb;
    }
  } else {
    rgb = layer.colorSet.get(c);
  }
  rgbColor.ensureIs(rgb);
  return rgb
}

module.exports.Renderer = Renderer;
