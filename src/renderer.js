const algorithm = require('./algorithm.js');
const rgbColor = require('./rgb_color.js');
const plane = require('./plane.js');
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
        tileset: null,
        palette: null,
        attributes: null,
        size: null,
        spriteList: null,
      }
    ]
    this.isConnected = false;
    this.interrupts = null;
    this.grid = null;
    this.haveRenderedPlaneOnce = false;
    this._inspectScanline = null;
    this._inspectCallback = null;
  }

  connect(inputList) {
    if (this.isConnected) {
      return;
    }

    if (!types.isArray(inputList)) {
      throw new Error(`connect needs a list of layers`)
    }
    let input = inputList[0];

    let layer = this._layers[0];
    let allow = ['plane', 'size', 'camera', 'palette-rgbmap',
                 'tileset', 'palette', 'attributes', 'interrupts', 'spriteList',
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
    if (!input.palette || !types.isPalette(input.palette)) {
      throw new Error(`input.palette must be a non-null Palette`);
    }
    if (input.tileset && !types.isTileset(input.tileset)) {
      throw new Error(`input.tiles must be a Tileset, got ${input.tileset}`);
    }
    if (input.attributes && !types.isAttributes(input.attributes)) {
      throw new Error(`input.attributes must be a Attributes`);
    }
    if (input.interrupts && !types.isInterrupts(input.interrupts)) {
      throw new Error(`input.interrupts must be a Interrupts`);
    }

    layer.plane    = input.plane;
    layer.size     = input.size;
    layer.camera   = input.camera;
    layer.tileset  = input.tileset;
    layer.palette  = input.palette;
    layer.attributes = input.attributes;
    layer.spriteList = input.spriteList;
    this.grid        = input.grid;
    this.interrupts  = input.interrupts;
    this.isConnected = true;

    if (inputList.length > 1) {
      let input = inputList[1];
      if (this._layers.length == 1) {
        this._layers.push({});
        let upper = this._layers[1];
        upper.plane = input.plane;
        upper.conf = this._layers[0].conf;
      }
    }
  }

  flushBuffer() {
    let layer = this._layers[0];
    layer.rgbSurface = null;
  }

  getFirstPlane() {
    return this._layers[0].plane;
  }

  switchComponent(layerNum, compName, obj) {
    if (compName == 'tileset') {
      this._layers[layerNum].tileset = obj;
    } else if (compName == 'camera') {
      this._layers[layerNum].camera = obj;
    } else {
      throw new Error(`switchComponent can only be used for "camera","tileset"`);
    }
  }

  setInspector(scanline, callback) {
    this._inspectScanline = scanline;
    this._inspectCallback = callback;
  }

  render() {
    let bottomPalette = this._layers[0].palette;
    bottomPalette.ensureRGBMap();
    this._rgbmap = bottomPalette._rgbmap;

    let res = [];
    for (let i = 0; i < this._layers.length; i++) {
      res.push(this._renderLayer(this._layers[i], i == 0, this));
    }
    res.grid = this._gridSurface();
    return res;
  }

  _renderLayer(layer, isBg, system) {
    if (!layer.palette) {
      // set the bottom palette, need the rgbmap for rendering
      // TODO: does this break something?
      layer.palette = this._layers[0].palette;
    }

    // Calculate size of the buffer to render.
    let width = (layer.size && layer.size.width);
    let height = (layer.size && layer.size.height);
    if (!width || !height) {
      if (!layer.tileset) {
        width = layer.plane.width;
        height = layer.plane.height;
      } else {
        width = layer.plane.width * layer.tileset.tileWidth;
        height = layer.plane.height * layer.tileset.tileHeight;
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
      return this._renderRegion(layer, isBg, 0, 0, width, height);
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

    // Track the x-position at each scanline
    let xposTrack = {};

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
        xposTrack[renderBegin] = layer.camera.x;
        this._renderRegion(layer, isBg, 0, renderBegin, width, scanLine);
      }
      // Execute the irq that interrupts rasterization
      if (k < perIRQs.length) {
        perIRQs[k].irq(scanLine);
      }
      // Resume rendering at the given scanline
      renderBegin = scanLine;
    }

    // Store x-positions so that they can visualize
    system.interrupts.xposTrack = xposTrack;

    return layer.rgbSurface;
  }

  _renderRegion(layer, isBg, left, top, right, bottom) {
    // If plane has not been rendered yet, do so now.
    layer.plane.ensureReady();

    // Dispatch any inspector events
    if (!this._inspectScanline && !top) {
      if (this._onRenderComponents) {
        this.renderComponents(
          this._onRenderComponents,
          this._onRenderSettings,
          this._onRenderCallback,
        );
      }
    } else if (this._inspectScanline && this._inspectCallback) {
      if (this._inspectScanline >= top && this._inspectScanline < bottom) {
        let eventObj = {
        };
        this._inspectCallback(eventObj);

        if (this._onRenderComponents) {
          this.renderComponents(
            this._onRenderComponents,
            this._onRenderSettings,
            this._onRenderCallback,
          );
        }
      }
    }

    let source = layer.plane.data;
    let sourcePitch = layer.plane.pitch;
    let sourceWidth = layer.plane.width;
    let sourceHeight = layer.plane.height;

    if (layer.tileset != null) {
      // Calculate the size
      let tileSize = layer.tileset.tileWidth * layer.tileset.tileHeight;
      let numPoints = layer.plane.height * layer.plane.width;
      sourceWidth = layer.plane.width * layer.tileset.tileWidth;
      sourceHeight = layer.plane.height * layer.tileset.tileHeight;
      sourcePitch = layer.tileset.tileWidth * layer.plane.width;
      source = new Uint8Array(numPoints * tileSize);

      for (let yTile = 0; yTile < layer.plane.height; yTile++) {
        for (let xTile = 0; xTile < layer.plane.width; xTile++) {
          let k = yTile*layer.plane.pitch + xTile;
          let c = layer.plane.data[k];
          let t = layer.tileset.get(c);
          if (t === undefined) {
            continue;
          }
          for (let i = 0; i < t.height; i++) {
            for (let j = 0; j < t.width; j++) {
              let y = yTile * layer.tileset.tileHeight + i;
              let x = xTile * layer.tileset.tileWidth + j;
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
          if (layer.attributes) {
            let c = layer.attributes.realizeIndexedColor(source[s], x, y);
            rgb = this._toColor(layer, c);
          } else {
            rgb = this._toColor(layer, source[s]);
          }
          layer.rgbSurface.buff[t+0] = rgb.r;
          layer.rgbSurface.buff[t+1] = rgb.g;
          layer.rgbSurface.buff[t+2] = rgb.b;
          // TODO: Incorrect
          if (!isBg && source[s] == 0) {
            layer.rgbSurface.buff[t+3] = 0x00;
          } else {
            layer.rgbSurface.buff[t+3] = 0xff;
          }
        }
      }
    }

    if (layer.spriteList && layer.spriteList.enabled) {
      let chardat = layer.spriteList.chardat || layer.tileset;
      if (!chardat) {
        throw new Error('cannot render sprites without character data')
      }

      // TODO: assuming the default piece_size, FIXME
      let piece_size = 8;

      // draw back-to-front so that sprite[i] is above sprite[j] where i < j
      for (let k = layer.spriteList.items.length - 1; k >= 0; k--) {
        let spr = layer.spriteList.items[k];
        let sx = Math.floor(spr.x);
        let sy = Math.floor(spr.y);
        // ensure size of sprite is set
        if (sx === null || sx === undefined || sx < 0 || sx >= right) {
          continue;
        }
        if (sy === null || sy === undefined || sy < 0 || sy >= bottom) {
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
            let x = px + sx;
            let y = py + sy;
            if (x >= right || y >= bottom) {
              continue;
            }
            // behind flag
            if (spr.b === 0) {
              let lx = (x + scrollX + layer.plane.width) % layer.plane.width;
              let ly = (y + scrollY + layer.plane.height) % layer.plane.height;
              let v = layer.plane.get(lx, ly);
              if (v > 0) {
                continue;
              }
            }
            let t = y*targetPitch + x*4;
            // color value for this pixel
            let rx = spr.h ? obj.width  - px - 1 : px;
            let ry = spr.v ? obj.height - py - 1 : py;
            let c = obj.get(rx, ry);
            if (c > 0) {
              if (spr.a !== null && spr.a !== undefined) {
                // TODO: test me!
                c = (c % piece_size) + Math.floor(spr.a) * piece_size;
              }
              let rgb = this._toColor(layer, c);
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

  onRenderComponents(components, settings, callback) {
    this._onRenderComponents = components;
    this._onRenderSettings = settings;
    this._onRenderCallback = callback;
    this.renderComponents(components, settings, callback);
  }

  renderComponents(components, settings, callback) {
    let system = this;
    let myPlane = this._layers[0].plane;
    let myTiles = this._layers[0].tileset;
    let myPalette = this._layers[0].palette;
    let myAttributes = this._layers[0].attributes;
    let myInterrupts = system.interrupts;
    settings = settings || {};
    components = components || [];

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
          let components = [{
            plane: myPlane,
            palette: myPalette,
          }];
          this.innerPlaneRenderer.connect(components);
        }
        let surfaces = this.innerPlaneRenderer.render();
        let layer = surfaces[0];
        callback('plane', layer);

      } else if (comp == 'palette') {
        let opt = {};
        // TODO: test me
        if (settings.palette) {
          if (settings.palette['*']) {
            opt = settings.palette['*'];
          } else if (myPalette.name) {
            opt = settings.palette[myPalette.name];
          }
        }
        let surface = myPalette.visualize(opt);
        callback('palette', surface);

      } else if (comp == 'palette-rgbmap') {
        let opt = {};
        if (settings['palette-rgbmap']) {
          let conf = settings['palette-rgbmap'];
          if (conf['*']) {
            opt = conf['*'];
          } else if (myPalette.name) {
            opt = conf[myPalette.name];
          }
        }
        opt.rgbmap = true;
        let surface = myPalette.visualize(opt);
        callback('palette-rgbmap', surface);

      } else if (comp == 'tileset') {
        if (myTiles) {
          let surface = myTiles.visualize({palette: myPalette});
          callback('tileset', surface);
        } else {
          callback('tileset', null);
        }

      } else if (comp == 'attributes') {
        if (myAttributes) {
          let surface = myAttributes.visualize();
          callback('attributes', surface);
        } else {
          callback('attributes', null);
        }

      } else if (comp == 'interrupts') {
        if (myInterrupts) {
          let surface = myInterrupts.visualize();
          callback('interrupts', surface);
        } else {
          callback('interrupts', null);
        }

      } else {
        throw new Error(`unknown component '${comp}'`);
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
      };
    }
    return null;
  }

  _toColor(layer, c) {
    let rgb;
    if (c !== 0 && !c) {
      throw new Error(`invalid color ${c}`);
    }
    rgb = layer.palette.getRGBUsing(c, this._rgbmap);
    return new rgbColor.RGBColor(rgb);
  }
}

module.exports.Renderer = Renderer;
