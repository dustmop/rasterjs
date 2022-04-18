const algorithm = require('./algorithm.js');
const rgbColor = require('./rgb_color.js');
const plane = require('./plane.js');
const colorSet = require('./color_set.js');
const tiles = require('./tiles.js');
const palette = require('./palette.js');
const attrs = require('./attributes.js');
const types = require('./types.js');
const verboseLogger = require('./verbose_logger.js');

let verbose = new verboseLogger.Logger();

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
      camera: null,
      plane: null,
      colorSet: null,
      tiles: null,
      palette: null,
      attrs: null,
      size: null,
    }
  ]
  this.interrupts = null;
  this.grid = null;
}

Renderer.prototype.connect = function(input) {
  let layer = this._layers[0];
  let allow = ['plane', 'colorSet', 'size', 'camera',
               'tiles', 'palette', 'attrs', 'interrupts', 'font', 'grid'];
  let keys = Object.keys(input);
  for (let i = 0; i < keys.length; i++) {
    let k = keys[i];
    if (!allow.includes(k)) {
      throw new Error(`connect param has unrecognized key "${k}"`);
    }
  }

  verbose.log(`renderer.connect components: ${Object.keys(input)}`);

  if (!input.plane || !types.isPlane(input.plane)) {
    throw new Error(`input.plane must be a non-null Plane`);
  }
  if (!input.colorSet || !types.isColorSet(input.colorSet)) {
    throw new Error(`input.colorSet must be a non-null colorSet`);
  }
  if (input.tiles && !types.isTileset(input.tiles)) {
    throw new Error(`input.tiles must be a Tileset, got ${input.tiles}`);
  }
  if (input.palette && !types.isPalette(input.palette)) {
    throw new Error(`input.palette must be a Palette, got ${input.palette}`);
  }
  if (input.attrs && !types.isAttributes(input.attrs)) {
    throw new Error(`input.attrs must be a Attributes`);
  }
  if (input.interrupts && !types.isInterrupts(input.interrupts)) {
    throw new Error(`input.interrupts must be a Interrupts`);
  }

  layer.plane    = input.plane;
  layer.size     = input.size;
  layer.camera   = input.camera;
  // TODO: colorSet should be 'global'
  layer.colorSet = input.colorSet;
  layer.tiles    = input.tiles;
  layer.palette  = input.palette;
  layer.attrs    = input.attrs;
  this.grid       = input.grid;
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

Renderer.prototype.render = function() {
  let system = this;
  let layer = this._layers[0];

  // Calculate size of the buffer to render.
  let width = (layer.size && layer.size.width);
  let height = (layer.size && layer.size.height);
  if (!width || !height) {
    if (!layer.tiles) {
      width = layer.plane.width;
      height = layer.plane.height;
    } else {
      width = layer.plane.width * layer.tiles.tileWidth;
      height = layer.plane.height * layer.tiles.tileHeight;
    }
  }

  if (this.grid && !this.grid.buff) {
    this._renderGrid();
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

  // If no interrupts, render everything at once.
  if (!system.interrupts) {
    return [this._renderRegion(layer, 0, 0, width, height),
            this._gridSurface()];
  }

  // Otherwise, collect IRQs per each scanline
  let perIRQs = [];
  for (let k = 0; k < system.interrupts.length; k++) {
    let row = system.interrupts.get(k);
    if (types.isArray(row.scanline)) {
      let lineRange = row.scanline;
      // TODO: Assume a pair of integers
      for (let j = lineRange[0]; j < lineRange[1]+1; j++) {
        perIRQs.push({scanline: j, irq: row.irq});
      }
      continue;
    } else if (types.isNumber(row.scanline)) {
      perIRQs.push({scanline: row.scanline, irq: row.irq});
    } else {
      throw new Error(`invalid scanline number: ${row.scanline}`);
    }
  }

  // Per region rendering
  let renderBegin = 0;
  for (let k = 0; k < perIRQs.length + 1; k++) {
    // Render a region up until the given scanline
    let scanLine;
    if (k < perIRQs.length) {
      scanLine = Math.min(perIRQs[k].scanline, height);
    } else {
      scanLine = height;
    }
    if (scanLine > renderBegin) {
      this._renderRegion(layer, 0, renderBegin, width, scanLine);
    }
    // Execute the irq that interrupts rasterization
    if (k < perIRQs.length) {
      perIRQs[k].irq(scanLine);
    }
    // Resume rendering at the given scanline
    renderBegin = scanLine;
  }

  return [layer.rgbSurface, this._gridSurface()];
}

Renderer.prototype._renderRegion = function(layer, left, top, right, bottom) {
  // If plane has not been rendered yet, do so now.
  layer.plane.ensureReady();

  let source = layer.plane.data;
  let sourcePitch = layer.plane.pitch;
  let sourceWidth = layer.plane.width;
  let sourceHeight = layer.plane.height;

  if (layer.tiles != null) {
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

  let scrollY = Math.floor((layer.camera && layer.camera.y) || 0);
  let scrollX = Math.floor((layer.camera && layer.camera.x) || 0);
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

Renderer.prototype.renderComponents = function(components, settings, callback) {
  let myPlane = this._layers[0].plane;
  let myColorSet = this._layers[0].colorSet;
  let myTiles = this._layers[0].tiles;
  let myPalette = this._layers[0].palette;
  settings = settings || {};

  if (settings.resize) {
    let width = settings.resize.width;
    let height = Math.floor(width / myPlane.width * myPlane.height);
    myPlane = myPlane.resize(width, height);
  }

  for (let i = 0; i < components.length; i++) {
    let comp = components[i];
    if (comp == 'plane') {
      if (!this.innerPlaneRenderer) {
        this.innerPlaneRenderer = new Renderer();
        let components = {
          plane: myPlane,
          colorSet: myColorSet,
        }
        this.innerPlaneRenderer.connect(components);
      }
      let surfaces = this.innerPlaneRenderer.render();
      let layer = surfaces[0];
      callback('plane', layer);

    } else if (comp == 'palette') {
      if (myPalette) {
        let surface = myPalette.serialize();
        callback('palette', surface);
      } else {
        let opt = {};
        if (settings.colorSet && myColorSet.name) {
          if (settings.colorSet['*']) {
            opt = settings.colorSet['*'];
          } else {
            opt = settings.colorSet[myColorSet.name];
          }
        }
        let surface = myColorSet.serialize(opt);
        callback('palette', surface);
      }

    } else if (comp == 'tileset') {
      if (myTiles) {
        let surface = myTiles.serialize();
        callback('tileset', surface);
      } else {
        callback('tileset', null);
      }
    }
  }
}

Renderer.prototype._renderGrid = function() {
  let width = this.grid.width * this.grid.zoom;
  let height = this.grid.height * this.grid.zoom;
  let unit = this.grid.unit * this.grid.zoom;

  let targetPoint = unit;
  let lastPoint = targetPoint - 1;
  let numPoints = width*height;

  let buff = new Uint8Array(numPoints*4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let k = (y*width + x)*4;
      if (((y % targetPoint) == lastPoint) || (x % targetPoint) == lastPoint) {
        buff[k+0] = 0x00;
        buff[k+1] = 0xe0;
        buff[k+2] = 0x00;
        buff[k+3] = 0xb0;
      } else {
        buff[k+0] = 0x00;
        buff[k+1] = 0x00;
        buff[k+2] = 0x00;
        buff[k+3] = 0x00;
      }
    }
  }

  this.grid.width = width;
  this.grid.height = height;
  this.grid.buff = buff;
}

Renderer.prototype._gridSurface = function() {
  if (this.grid && this.grid.buff) {
    return {
      width: this.grid.width,
      height: this.grid.height,
      buff: this.grid.buff,
    }
  }
  return null;
}

Renderer.prototype._toColor = function(c) {
  let layer = this._layers[0];
  let rgb;
  if (c !== 0 && !c) {
    throw new Error(`invalid color ${c}`);
  }
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

function Interrupts(arr) {
  this.arr = arr;
  this.length = this.arr.length;
  this._assertInterruptFields();
  return this;
}

Interrupts.prototype._assertInterruptFields = function() {
  for (let k = 0; k < this.arr.length; k++) {
    let elem = this.arr[k];
    if (elem.scanline === undefined) {
      throw new Error(`useInterrupts element ${k} missing field 'scanline'`);
    }
    // TODO: scanline must be Number or [Number], and in ascending order
    if (!elem.irq) {
      throw new Error(`useInterrupts element ${k} missing field 'irq'`);
    }
    if (elem.irq.constructor.name != 'Function') {
      throw new Error(`useInterrupts element ${k}.irq must be function`);
    }
  }
}

Interrupts.prototype.shiftDown = function(line, obj) {
  let startIndex = obj.startIndex;
  let endIndex = obj.endIndex || this.arr.length;
  let deltaValue = null;
  for (let k = startIndex; k < endIndex; k++) {
    let elem = this.arr[k];
    if (k == startIndex) {
      // first row of our subset
      deltaValue = line - elem.scanline;
    }
    if (types.isNumber(elem.scanline)) {
      elem.scanline = elem.scanline + deltaValue;
    } else if (types.isArray(elem.scanline)) {
      let first = elem.scanline[0];
      let second = elem.scanline[1];
      elem.scanline = [first + deltaValue, second + deltaValue];
    }
  }
}

Interrupts.prototype.get = function(i) {
  return this.arr[i];
}


module.exports.Renderer = Renderer;
module.exports.Interrupts = Interrupts;
