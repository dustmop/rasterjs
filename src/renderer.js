const algorithm = require('./algorithm.js');
const rgbColor = require('./rgb_color.js');
const plane = require('./plane.js');
const colorMap = require('./color_map.js');
const tiles = require('./tiles.js');
const palette = require('./palette.js');
const attrs = require('./attributes.js');
const types = require('./types.js');
const verboseLogger = require('./verbose_logger.js');

let verbose = new verboseLogger.Logger();

class Renderer {
  constructor() {
    this._init();
    return this;
  }

  clear() {
    this._init();
  }

  _init() {
    this._layers = [
      {
        rgbSurface: null,
        camera: null,
        plane: null,
        colorMap: null,
        tiles: null,
        palette: null,
        attrs: null,
        size: null,
        spriteList: null,
      }
    ]
    this.isConnected = false;
    this.interrupts = null;
    this.grid = null;
    this.haveRenderedPlaneOnce = false;
  }

  connect(input) {
    if (this.isConnected) {
      return;
    }

    let layer = this._layers[0];
    let allow = ['plane', 'colorMap', 'size', 'camera',
                 'tiles', 'palette', 'attrs', 'interrupts', 'spriteList',
                 'font', 'grid'];
    let keys = Object.keys(input);
    for (let k of keys) {
      if (!allow.includes(k)) {
        throw new Error(`connect param has unrecognized key "${k}"`);
      }
    }

    verbose.log(`renderer.connect components: ${Object.keys(input)}`, 5);

    if (!input.plane || !types.isPlane(input.plane)) {
      throw new Error(`input.plane must be a non-null Plane`);
    }
    if (!input.colorMap || !types.isColorMap(input.colorMap)) {
      throw new Error(`input.colorMap must be a non-null colorMap`);
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
    // TODO: colorMap should be 'global'
    layer.colorMap = input.colorMap;
    layer.tiles    = input.tiles;
    layer.palette  = input.palette;
    layer.attrs    = input.attrs;
    layer.spriteList = input.spriteList;
    this.grid        = input.grid;
    this.interrupts  = input.interrupts;
    this.isConnected = true;
  }

  flushBuffer() {
    let layer = this._layers[0];
    layer.rgbSurface = null;
  }

  getFirstPlane() {
    return this._layers[0].plane;
  }

  switchComponent(layerNum, compName, obj) {
    if (compName != 'tiles') {
      throw new Error(`switchComponent can only be used for "tiles"`);
    }
    this._layers[layerNum].tiles = obj;
  }

  render() {
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

  _renderRegion(layer, left, top, right, bottom) {
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

    if (layer.spriteList) {
      layer.spriteList.ensureValid();
      let chardat = layer.spriteList.chardat || layer.tiles;
      if (!chardat) {
        throw new Error('cannot render sprites without character data')
      }
      for (let k = 0; k < layer.spriteList.items.length; k++) {
        let spr = layer.spriteList.items[k];
        // ensure size of sprite is set
        if ((spr.x === null) || (spr.x === undefined)) {
          continue;
        }
        if ((spr.y === null) || (spr.y === undefined)) {
          continue;
        }
        // invisible flag
        if (spr.i) {
          continue;
        }
        // the character object
        let obj = chardat.get(spr.c);
        if (!obj) {
          continue;
        }
        for (let py = 0; py < obj.height; py++) {
          for (let px = 0; px < obj.width; px++) {
            let x = px + spr.x;
            let y = py + spr.y;
            let t = y*targetPitch + x*4;
            // color value for this pixel
            let c = obj.get(px, py);
            if (c > 0) {
              let rgb = this._toColor(c);
              if (spr.m) {
                layer.rgbSurface.buff[t+0] += rgb.r;
                layer.rgbSurface.buff[t+1] += rgb.g;
                layer.rgbSurface.buff[t+2] += rgb.b;
                layer.rgbSurface.buff[t+3] = 0xff;
              } else {
                layer.rgbSurface.buff[t+0] = rgb.r;
                layer.rgbSurface.buff[t+1] = rgb.g;
                layer.rgbSurface.buff[t+2] = rgb.b;
                layer.rgbSurface.buff[t+3] = 0xff;
              }
            }
          }
        }
      }
    }

    return layer.rgbSurface;
  }

  renderComponents(components, settings, callback) {
    let myPlane = this._layers[0].plane;
    let myColorMap = this._layers[0].colorMap;
    let myTiles = this._layers[0].tiles;
    let myPalette = this._layers[0].palette;
    settings = settings || {};

    if (settings.resize && !this.haveRenderedPlaneOnce) {
      let width = settings.resize.width;
      let height = Math.floor(width / myPlane.width * myPlane.height);
      myPlane = myPlane.resize(width, height);
    }

    for (let comp of components) {
      if (comp == 'plane') {
        if (this.haveRenderedPlaneOnce) {
          continue;
        }
        this.haveRenderedPlaneOnce = true;

        if (!this.innerPlaneRenderer) {
          this.innerPlaneRenderer = new Renderer();
          let components = {
            plane: myPlane,
            colorMap: myColorMap,
          }
          this.innerPlaneRenderer.connect(components);
        }
        let surfaces = this.innerPlaneRenderer.render();
        let layer = surfaces[0];
        callback('plane', layer);

      } else if (comp == 'colorMap') {
        let opt = {};
        if (settings.colorMap && myColorMap.name) {
          if (settings.colorMap['*']) {
            opt = settings.colorMap['*'];
          } else {
            opt = settings.colorMap[myColorMap.name];
          }
        }
        let surface = myColorMap.serialize(opt);
        callback('colorMap', surface);

      } else if (comp == 'palette') {
        if (myPalette) {
          let surface = myPalette.serialize();
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

  _renderGrid() {
    let width = this.grid.width * this.grid.zoom;
    let height = this.grid.height * this.grid.zoom;
    let unit = this.grid.unit * this.grid.zoom;
    let pitch = width * 4;

    if (width == 0 || height == 0 || unit == 0) {
      throw new Error('could not render grid, invalid dimensions: width=${width}, height=${height}, unit=${unit}');
    }

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
    this.grid.pitch = pitch;
  }

  _gridSurface() {
    if (this.grid && this.grid.buff) {
      return {
        width: this.grid.width,
        height: this.grid.height,
        buff: this.grid.buff,
        pitch: this.grid.pitch,
      }
    }
    return null;
  }

  _toColor(c) {
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
      rgb = layer.colorMap.get(c);
    }
    rgbColor.ensureIs(rgb);
    return rgb
  }
}


class Interrupts {
  constructor(arr) {
    this.arr = arr;
    this.length = this.arr.length;
    this._assertInterruptFields();
    return this;
  }

  _assertInterruptFields() {
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

  shiftDown(line, obj) {
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

  get(i) {
    return this.arr[i];
  }
}


module.exports.Renderer = Renderer;
module.exports.Interrupts = Interrupts;
