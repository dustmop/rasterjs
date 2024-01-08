const algorithm = require('./algorithm.js');
const component = require('./component.js');
const compositor = require('./compositor.js');
const rgbColor = require('./rgb_color.js');
const field = require('./field.js');
const tiles = require('./tiles.js');
const palette = require('./palette.js');
const colorspace = require('./colorspace.js');
const types = require('./types.js');
const verboseLogger = require('./verbose_logger.js');

let verbose = new verboseLogger.Logger();

const R_INDEX = 0;
const G_INDEX = 1;
const B_INDEX = 2;

class Renderer {
  constructor() {
    this._init();
    return this;
  }

  clear() {
    this._init();
  }

  clearExceptInitCallback() {
    let preserve = this._renderEventCallback;
    this.clear();
    this._renderEventCallback = preserve;
  }

  _init() {
    this._layers = null;
    this._surfs = null;
    this._world = {};
    this.isConnected = false;
    this.interrupts = null;
    this.haveRenderedFieldOnce = false;
    this._inspector = null;
    this._renderEventCallback = null;
    this._renderWidth = null;
    this._renderHeight = null;
    this._create = null;
    this._comp = null;
    this.requirements = {};
  }

  connect(inputList) {
    if (this.isConnected) {
      return;
    }
    if (!types.isArray(inputList)) {
      throw new Error(`connect needs a list of layers`)
    }

    let numLayers = inputList.length;
    this._layers = new Array(numLayers);
    for (let i = 0; i < numLayers; i++) {
      this._layers[i] = this._createLayer(inputList[i]);
    }

    this._world = inputList.world || {};
    this._assertObjectKeys(this._world, ['interrupts', 'spritelist',
                                         'palette', 'grid']);

    this.isConnected = true;
  }

  _createLayer(item) {
    let layer = {};
    this._assertObjectKeys(item, ['field', 'size', 'scroll', 'palette-rgbmap',
                                  'tileset', 'palette', 'colorspace']);

    verbose.log(`renderer.connect components: ${Object.keys(item)}`, 5);

    if (!item.field || !types.isField(item.field)) {
      throw new Error(`layer.field must be a non-null Field`);
    }
    if (item.palette && !types.isPalette(item.palette)) {
      throw new Error(`layer.palette must be a non-null Palette`);
    }
    if (item.tileset && !types.isTileset(item.tileset)) {
      throw new Error(`layer.tiles must be a Tileset, got ${item.tileset}`);
    }
    if (item.colorspace && !types.isColorspace(item.colorspace)) {
      throw new Error(`layer.colorspace must be a Colorspace`);
    }

    layer.field    = item.field;
    layer.size     = item.size;
    layer.scroll   = item.scroll;
    layer.tileset  = item.tileset;
    layer.palette  = item.palette;
    layer.colorspace = item.colorspace;
    this.isConnected = true;
    return layer;
  }


  _assertObjectKeys(item, allowed) {
    let keys = Object.keys(item);
    for (let k of keys) {
      if (!allowed.includes(k)) {
        throw new Error(`unrecognized key "${k}"`);
      }
    }
  }

  flushBuffer() {
    this._surfs = null;
  }

  getFirstField() {
    return this._layers[0].field;
  }

  changeGrid(zoomScale, width, height, unit) {
    this._world.grid = {
      zoom: zoomScale,
      width: width,
      height: height,
      unit: unit,
    };
  }

  switchComponent(layerNum, compName, obj) {
    component.ensureValidKind(compName);
    if (!this._layers) {
      return;
    }
    this._layers[layerNum][compName] = obj;
  }

  getInspector() {
    if (this._inspector == null) {
      this._inspector = new Inspector(this);
    }
    return this._inspector;
  }

  setRenderSize(width, height) {
    this._renderWidth = width;
    this._renderHeight = height;
  }

  setOnRenderEvent(callback) {
    this._renderEventCallback = callback;
  }

  render() {
    let world = this._world || {};

    let bottomPalette = world.palette;
    if (!bottomPalette) {
      bottomPalette = this._layers[0].palette;
    }
    bottomPalette.ensureRGBMap();
    this._rgbmap = bottomPalette._rgbmap;

    if (!this._renderWidth || !this._renderHeight) {
      let bottomField = this._layers[0].field;
      this._renderWidth = bottomField.width;
      this._renderHeight = bottomField.height;
    }

    this._renderScene(world);
    this._maybeGridToSurface(world.grid);
    if (this._renderEventCallback) {
      this._renderEventCallback();
    }

    // the renderer will return multiple RGB surfaces
    // by default, it allows the display to perform hardware compositing
    // by setting this option, the renderer will do software compositing
    if (this.requirements.forceSoftwareCompositor) {
      if (this._comp == null) {
        this._comp = new compositor.Compositor();
      }
      let combined = this._comp.combine(this._surfs,
                                        this._renderWidth,
                                        this._renderHeight,
                                        1);
      combined.grid = null;
      return combined;
    }

    return this._surfs;
  }

  _renderScene(world) {
    let width = this._renderWidth;
    let height = this._renderHeight;

    // Allocate rendering results for each layer
    if (this._surfs == null) {
      let numPoints = width * height;
      let numLayers = this._layers.length;
      this._surfs = new Array(numLayers);
      for (let i = 0; i < numLayers; i++) {
        this._surfs[i] = {};
        let surface = this._surfs[i];
        surface.width = width;
        surface.height = height;
        surface.buff = new Uint8Array(numPoints * 4);
        surface.pitch = width * 4;
      }
    }

    if (this._world.grid && !this._world.grid.buff) {
      this._renderGrid(this._world.grid);
    }

    // If no interrupts, render everything at once.
    if (!world.interrupts) {
      this._renderScreenSection(world, 0, 0, width, height);
      this._maybeHandleComponentsAndInspect(null, 0, height);
      return;
    }

    // Otherwise, collect IRQs per each scanline
    let perIRQs = [];
    for (let k = 0; k < world.interrupts.length; k++) {
      let row = world.interrupts.get(k);
      if (types.isArray(row.scanline)) {
        let lineRange = row.scanline;
        // TODO: Asset it is a pair of integers
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

    // Track the x-position at each scanline of the bottom layer
    // TODO: generalize to multiple layers
    let xposTrack = {};
    let bottomLayer = this._layers[0];

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
        xposTrack[renderBegin] = bottomLayer.scroll.x;
        this._renderScreenSection(world, 0, renderBegin, width, scanLine);
        this._maybeHandleComponentsAndInspect(k, renderBegin, scanLine);
      }
      // Execute the irq that interrupts rasterization
      if (k < perIRQs.length) {
        perIRQs[k].irq(scanLine);
      }
      // Resume rendering at the given scanline
      renderBegin = scanLine;
    }

    // Store x-positions so that they can visualize
    world.interrupts.xposTrack = xposTrack;
  }

  _renderScreenSection(world, left, top, right, bottom) {
    // If any layers have fields with pending changes, resolve them
    for (let layer of this._layers) {
      layer.field.fullyResolve();
    }

    for (let i = 0; i < this._layers.length; i++) {
      this._renderLayerRegion(this._layers[i], this._surfs[i], world, i == 0,
                              left, top, right, bottom);
    }
    let lastSurface = this._surfs[this._surfs.length - 1];
    this._renderSprites(world, lastSurface, left, top, right, bottom);
  }

  _renderLayerRegion(layer, surf, world, isBg, left, top, right, bottom) {

    let source = layer.field.data;
    let sourcePitch = layer.field.pitch;
    let sourceWidth = layer.field.width;
    let sourceHeight = layer.field.height;

    if (layer.tileset != null) {
      // Calculate the size
      let tileSize = layer.tileset.tileWidth * layer.tileset.tileHeight;
      let numPoints = layer.field.height * layer.field.width;
      sourceWidth = layer.field.width * layer.tileset.tileWidth;
      sourceHeight = layer.field.height * layer.tileset.tileHeight;
      sourcePitch = layer.tileset.tileWidth * layer.field.width;
      source = new Uint8Array(numPoints * tileSize);

      for (let yTile = 0; yTile < layer.field.height; yTile++) {
        for (let xTile = 0; xTile < layer.field.width; xTile++) {
          let k = yTile*layer.field.pitch + xTile;
          let c = layer.field.data[k];
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

    let rgbtuple = new Uint8Array(4);

    let targetPitch = surf.pitch;

    let scrollY = Math.floor((layer.scroll && layer.scroll.y) || 0);
    let scrollX = Math.floor((layer.scroll && layer.scroll.x) || 0);

    // TODO: allow layers aside from the bottom to enable wrap
    let isWrapped = false;
    if (sourceWidth >= this._renderWidth &&
        sourceHeight >= this._renderHeight) {
      isWrapped = true;
    }
    let numPlacements = 1;

    if (isWrapped) {
      numPlacements = 4;
      scrollY = ((scrollY % sourceHeight) + sourceHeight) % sourceHeight;
      scrollX = ((scrollX % sourceWidth) + sourceWidth) % sourceWidth;
    }

    for (let placement = 0; placement < numPlacements; placement++) {
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

      if (!isWrapped) {
        regL = 0;
        regR = layer.field.width;
        if (layer.tileset) {
          regR *= layer.tileset.tileWidth;
        }
        if (regR >= right) {
          regR = right;
        }
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
          let c = source[s];
          if (layer.colorspace) {
            let cell = layer.colorspace.getCellAtPixel(x, y);
            let attr = cell.attr;
            if (Array.isArray(attr)) {
              c = attr[c % attr.length];
            } else {
              c = layer.colorspace.realizeIndexedColor(c, x, y);
            }
          }
          if (!this._toColor(layer, c, rgbtuple)) {
            surf.buff[t+3] = 0x00;
            continue;
          }
          surf.buff[t+0] = rgbtuple[R_INDEX];
          surf.buff[t+1] = rgbtuple[G_INDEX];
          surf.buff[t+2] = rgbtuple[B_INDEX];
          // TODO: Incorrect, 
          if (!isBg && source[s] == 0) {
            surf.buff[t+3] = 0x00;
          } else {
            surf.buff[t+3] = 0xff;
          }
        }
      }
    }
  }

  _renderSprites(world, surf, _left, _top, right, bottom) {
    // TODO: fix me
    let layer = this._layers[this._layers.length - 1];
    let targetPitch = surf.pitch;
    let rgbtuple = new Uint8Array(4);
    let scrollY = Math.floor((layer.scroll && layer.scroll.y) || 0);
    let scrollX = Math.floor((layer.scroll && layer.scroll.x) || 0);

    if (!world.spritelist || !world.spritelist.enabled) {
      return;
    }
    if (world.spritelist.items.length == 0) {
      return;
    }

    let chardat = world.spritelist.chardat || layer.tileset;
    if (!chardat) {
      throw new Error('cannot render sprites without character data')
    }

    // draw back-to-front so that sprite[i] is above sprite[j] where i < j
    for (let k = world.spritelist.items.length - 1; k >= 0; k--) {
      let spr = world.spritelist.items[k];

      if (spr.a) {
        throw new Error(`deprecated: sprite.a, use sprite.p`);
      }

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
            let lx = (x + scrollX + layer.field.width) % layer.field.width;
            let ly = (y + scrollY + layer.field.height) % layer.field.height;
            let v = layer.field.get(lx, ly);
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
            if (spr.p != null) {
              c += spr.p;
            }
            this._toColor(layer, c, rgbtuple);
            if (spr.m) {
              surf.buff[t+0] += rgbtuple[R_INDEX];
              surf.buff[t+1] += rgbtuple[G_INDEX];
              surf.buff[t+2] += rgbtuple[B_INDEX];
              surf.buff[t+3] = 0xff;
            } else {
              surf.buff[t+0] = rgbtuple[R_INDEX];
              surf.buff[t+1] = rgbtuple[G_INDEX];
              surf.buff[t+2] = rgbtuple[B_INDEX];
              surf.buff[t+3] = 0xff;
            }
          }
        }
      }
    }
  }

  _maybeHandleComponentsAndInspect(numSplit, top, bottom) {

    let inspectX, inspectY;
    if (this._inspector) {
      if (this._inspector._unitType == 'display') {
        inspectX = this._inspector._unitX / this._inspector._zoom;
        inspectY = this._inspector._unitY / this._inspector._zoom;
      } else if (this._inspector._unitType == 'pixel') {
        inspectX = this._inspector._unitX;
        inspectY = this._inspector._unitY;
      } else if (this._inspector._unitType == 'tile') {
        let layer = this._layers[0];
        inspectX = this._inspector._unitX * layer.tileset.tileWidth;
        inspectY = this._inspector._unitY * layer.tileset.tileHeight;
      } else {
        throw new Error(`unknown unit type ${this._inspector._unitType}`);
      }
    }

    if (numSplit == null || (!this._inspector && numSplit == 1) ||
        (inspectY != null && inspectY >= top && inspectY < bottom)) {
      // 1) if single region, render all components at top
      // 2) if not being inspected, also render all components at top
      // 3) if being inspected and there are multiple regions, pick the
      //    region that corresponds to the inspected region
      if (this._viewComponentList) {
        this.renderComponents(
          this._viewComponentList,
          this._viewSettings,
          this._afterViewCallback,
        );
      }
    }

    if (inspectY != null && inspectY >= top && inspectY < bottom) {
      let layer = this._layers[0];
      this.fillInspectorAt(this._inspector, numSplit, inspectX, inspectY);
    }
  }

  fillInspectorAt(inspector, numSplit, x, y) {
    // TODO: how to inspect multiple layers?
    let layer = this._layers[0];
    this.inspectLayerAt(inspector, layer, numSplit, x, y);
  }

  inspectLayerAt(result, layer, numSplit, x, y) {
    x = Math.floor(x);
    y = Math.floor(y);
    let scrollX = Math.floor((layer.scroll && layer.scroll.x) || 0);
    let scrollY = Math.floor((layer.scroll && layer.scroll.y) || 0);

    // TODO: How does this work if !isWrapped
    let sourceWidth = layer.field.width;
    let sourceHeight = layer.field.height;
    if (layer.tileset) {
      sourceWidth *= layer.tileset.tileWidth;
      sourceHeight *= layer.tileset.tileHeight;
    }

    let posX = (x + scrollX) % sourceWidth;
    let posY = (y + scrollY) % sourceHeight;

    let tileX, tileY, tileID;
    let elemX, elemY;
    if (layer.tileset) {
      elemX = Math.floor(posX / layer.tileset.tileWidth);
      elemY = Math.floor(posY / layer.tileset.tileHeight);
      tileX = elemX;
      tileY = elemY;
    } else {
      elemX = Math.floor(posX);
      elemY = Math.floor(posY);
    }

    let val = layer.field.get(elemX, elemY);
    if (layer.tileset) {
      tileID = val;
    }
    if (val == null) {
      result.stop();
      return;
    }
    let color = val;
    let index = val;

    let cellX, cellY, pieceSize, pieceVal;
    if (layer.colorspace) {
      let cell = layer.colorspace.getCellAt(elemX, elemY);
      [cellX, cellY, pieceSize, pieceVal] = cell;
      index = pieceVal * pieceSize + (index % pieceSize);
    }

    let palidx;
    if (layer.palette) {
      palidx = index % layer.palette.length;
      color = layer.palette.entry(palidx).cval;
    }

    result.val = val;
    result.x   = x;
    result.y   = y;
    result.color   = color;
    result.piece   = pieceVal;
    result.cellX   = cellX;
    result.cellY   = cellY;
    result.tileX   = tileX;
    result.tileY   = tileY;
    result.tileID  = tileID;
    result.palidx  = palidx;
    result.scrollX = scrollX
    result.scrollY = scrollY;
    result.split = numSplit || 0;
  }

  onRenderComponents(components, settings, callback) {
    this._viewComponentList = components;
    this._viewSettings = settings;
    this._afterViewCallback = callback;
    this.renderComponents(components, settings, callback);
  }

  renderComponents(components, settings, callback) {
    let world = this._world;
    let myField = this._layers[0].field;
    let myTiles = this._layers[0].tileset;
    let myPalette = this._layers[0].palette;
    let myColorspace = this._layers[0].colorspace;
    let myInterrupts = world.interrupts;
    settings = settings || {};
    components = components || [];

    if (settings.resize && !this.haveRenderedFieldOnce) {
      let width = settings.resize.width;
      let height = Math.floor(width / myField.width * myField.height);
      myField = myField.resize(width, height);
    }

    for (let comp of components) {
      if (comp == 'field') {
        if (this.haveRenderedFieldOnce) {
          continue;
        }
        this.haveRenderedFieldOnce = true;

        if (!this.innerFieldRenderer) {
          this.innerFieldRenderer = new Renderer();
          let components = [{
            field: myField,
            palette: myPalette,
          }];
          this.innerFieldRenderer.connect(components);
        }
        let surfaces = this.innerFieldRenderer.render();
        let layer = surfaces[0];
        callback('field', layer);

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

      } else if (comp == 'colorspace') {
        if (myColorspace) {
          let surface = myColorspace.visualize();
          callback('colorspace', surface);
        } else {
          callback('colorspace', null);
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

  _renderGrid(grid) {
    let width = grid.width * grid.zoom;
    let height = grid.height * grid.zoom;
    let unit = grid.unit * grid.zoom;
    let pitch = width * 4;

    if (width == 0 || height == 0 || unit == 0) {
      throw new Error(`could not render grid, invalid dimensions: width=${width}, height=${height}, unit=${unit}`);
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

    grid.width = width;
    grid.height = height;
    grid.buff = buff;
    grid.pitch = pitch;
  }

  _maybeGridToSurface(grid) {
    this._surfs.grid = null;
    if (grid && grid.buff) {
      this._surfs.grid = {
        width: grid.width,
        height: grid.height,
        buff: grid.buff,
        pitch: grid.pitch,
      };
    }
  }

  _toColor(layer, c, rgbtuple) {
    let rgb;
    if (c !== 0 && !c) {
      // TODO: should be an error, but renderer needs to be guaranteed
      // to only access valid colors
      return false;
    }
    // TODO: fix me
    let palette = layer.palette;
    if (palette == null) {
      palette = this._world.palette;
    }
    palette.getRGBUsing(c, rgbtuple, this._rgbmap);
    return true;
  }
}


class Inspector {
  constructor(owner) {
    this._owner = owner;
    this._clear();
  }

  _clear() {
    this.val = null;
    this.x = null;
    this.y = null;
    this.color = null;
    this.piece = null;
    this.tileX = null;
    this.tileY = null;
    this.tileID = null;
    this.palidx = null;
    this.scrollX = null;
    this.scrollY = null;
  }

  setZoom(zoom) {
    this._zoom = zoom;
  }

  lookAt(x, y, optUnit) {
    optUnit = optUnit || {};
    this._unitX = x;
    this._unitY = y;
    // pixel, display, tile, interrupt
    this._unitType = optUnit.unit || 'pixel';
    x = Math.floor(x / 2);
    y = Math.floor(y / 2);

    // TODO: alternatively, if executor is stopped (has no drawFunc), fill
    // inspector data based upon the previous render
    //this._owner.fillInspectorAt(this, 0, x, y);
    if (this._executor) {
      this._executor._forceRender = true;
    }
  }

  stop() {
    this._clear();
  }
}


module.exports.Renderer = Renderer;
