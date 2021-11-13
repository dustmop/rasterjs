const colorSet = require('./color_set.js');
const drawing = require('./drawing.js');
const destructure = require('./destructure.js');
const algorithm = require('./algorithm.js');
const palette = require('./palette.js');
const geometry = require('./geometry.js');
const imageLoader = require('./image_loader.js');
const textLoader = require('./text_loader.js');
const displayAscii = require('./display_ascii.js');
const plane = require('./plane.js');
const scene = require('./scene.js');
const tiles = require('./tiles.js');
const rgbColor = require('./rgb_color.js');

////////////////////////////////////////

const FRAMES_LOOP_FOREVER = -1;

function Scene(env) {
  this._addMethods();
  this.env = env;
  this.resources = env.makeResources();
  this.display = env.makeDisplay();
  this.saveService = this.resources;

  this.colorSet = new colorSet.Set();
  this.font = null;
  this.rgbBuffer = null;
  this.palette = null;
  this.tiles = null;

  plane.setGlobalScene(this);
  this.aPlane = new plane.Plane();

  this._config = {};
  this.numFrames = FRAMES_LOOP_FOREVER;
  this.initialize();
  return this;
}

Scene.prototype.initialize = function () {
  this._config.zoomScale = 1;
  this._config.titleText = '';
  this.colorSet.clear();
  this.imgLoader = new imageLoader.Loader(this.resources, this);
  this.textLoader = new textLoader.TextLoader(this.resources);
  let options = this.env.getOptions();
  this.numFrames = options.num_frames || -1;
  if (options.display) {
    this.useDisplay(options.display);
  }
  this.display.initialize();
  if (options.colors) {
    this.useColors(options.colors);
  }
  if (options.zoom) {
    this.setZoom(options.zoom);
  }
}

Scene.prototype._addMethods = function() {
  let self = this;
  let d = new drawing.Drawing();
  let methods = d.getMethods();
  for (let i = 0; i < methods.length; i++) {
    let [fname, paramSpec, converter, impl] = methods[i];
    this[fname] = function() {
      let args = Array.from(arguments);
      if (paramSpec === undefined) {
        throw new Error(`function ${fname} does not have parameter spec`);
      }
      let realArgs = destructure.from(fname, paramSpec, args, converter);
      if (self._config.translateCenter) {
        self._translateArguments(paramSpec, realArgs);
      }
      self.aPlane[fname].apply(self.aPlane, realArgs);
    }
  }
}

Scene.prototype._removeMethods = function() {
  let self = this;
  let d = new drawing.Drawing();
  let methods = d.getMethods();
  for (let i = 0; i < methods.length; i++) {
    let [fname, paramSpec, converter, impl] = methods[i];
    delete this[fname];
  }
}

Scene.prototype._translateArguments = function(params, args) {
  let midX = this.aPlane.width / 2;
  let midY = this.aPlane.height / 2;
  for (let i = 0; i < params.length; i++) {
    let param = params[i];
    let arg = args[i];
    if (param.startsWith('x')) {
      if (args[i] === undefined) {
        args[i] = 0;
      }
      args[i] += midX;
    }
    if (param.startsWith('y')) {
      if (args[i] === undefined) {
        args[i] = 0;
      }
      args[i] += midY;
    }
  }
}

Scene.prototype.setSize = function(w, h) {
  this._config.width = w;
  this._config.height = h;
  if (this.aPlane.width == 0 || this.aPlane.height == 0) {
    this.aPlane.setSize(w, h);
  }
}

Scene.prototype.setScrollX = function(x) {
  this._config.scrollX = Math.floor(x);
}

Scene.prototype.setScrollY = function(y) {
  this._config.scrollY = Math.floor(y);
}

Scene.prototype.resetState = function() {
  this.colorSet.clear();
  this.aPlane.clear();
  this.palette = null;
  this.tiles = null;
  this.rgbBuffer = null;
  this._config = {};
  this._config.zoomScale = 1;
  this._config.usingNonPrimaryPlane = false;
  this._addMethods();
}

Scene.prototype.then = function(cb) {
  this.imgLoader.resolveAll(cb);
}

Scene.prototype.setZoom = function(scale) {
  this._config.zoomScale = scale;
}

Scene.prototype.setTitle = function(title) {
  this._config.titleText = title;
}

Scene.prototype.originAtCenter = function() {
  this._config.translateCenter = true;
}

Scene.prototype.useColors = function(obj) {
  return this.colorSet.use(obj);
}

Scene.prototype.appendColors = function(obj) {
  return this.colorSet.append(obj);
}

Scene.prototype.numColors = function() {
  return this.colorSet.size();
}

Scene.prototype.useDisplay = function(nameOrDisplay) {
  if (nameOrDisplay == 'ascii') {
    this.display = new displayAscii.DisplayAscii();
  } else if (this.isDisplayObject(nameOrDisplay)) {
    this.display = nameOrDisplay;
  } else {
    throw new Error(`Invalid display ${JSON.stringify(nameOrDisplay)}`);
  }
  this.display.initialize();
}

Scene.prototype.loadImage = function(filepath, opt) {
  return this.imgLoader.loadImage(filepath, opt);
}

Scene.prototype.select = function(x, y, w, h) {
  let make = this.aPlane.clone();
  make.offsetLeft = x;
  make.offsetTop = y;
  make.width = w;
  make.height = h;
  // TDOO: addMethods for destructure handling
  return make;
}

Scene.prototype._doRender = function(num, exitAfter, renderFunc, betweenFunc, finalFunc) {
  let plane = this.aPlane;
  let self = this;
  this.then(function() {
    self.display.setSize(self._config.width, self._config.height);
    self.display.setSource(plane, self._config.zoomScale);
    self.display.renderLoop(function() {
      if (renderFunc) {
        try {
          renderFunc();
        } catch(e) {
          console.log(e);
          throw e;
        }
      }
      if (betweenFunc) {
        betweenFunc();
      }
    }, num, exitAfter, finalFunc);
  });
}

Scene.prototype.show = function(finalFunc) {
  this._doRender(1, false, null, null, finalFunc);
}

Scene.prototype.run = function(renderFunc, betweenFrameFunc) {
  this._doRender(this.numFrames, true, renderFunc, betweenFrameFunc, null);
}

Scene.prototype.save = function(savepath) {
  this.aPlane.save(savepath);
}

Scene.prototype.quit = function() {
  this.display.appQuit();
}

Scene.prototype.nextFrame = function() {
  this.aPlane.nextFrame();
}

Scene.prototype.makeShape = function(method, params) {
  if (method == 'polygon') {
    let pointsOrPolygon = params[0];
    return geometry.convertToPolygon(pointsOrPolygon);
  } else if (method == 'rotate') {
    let [pointsOrPolygon, angle] = params;
    let polygon = geometry.convertToPolygon(pointsOrPolygon);
    polygon.rotate(angle);
    return polygon;
  } else if (method == 'load') {
    let [filepath, opt] = params;
    opt = opt || {};
    return this.loadImage(filepath, opt);
  }
}

Scene.prototype.setFont = function(filename) {
  let font = this.textLoader.loadFont(filename);
  this.font = font;
}

Scene.prototype.handleEvent = function(eventName, callback) {
  this.display.handleEvent(eventName, callback);
}

Scene.prototype.isDisplayObject = function(obj) {
  let needMethods = ['initialize', 'setSize', 'setSource', 'renderLoop'];
  for (let i = 0; i < needMethods.length; i++) {
    let method = obj[needMethods[i]];
    if (!method || typeof method != 'function') {
      return false;
    }
  }
  return true;
}

Scene.prototype.getPaletteEntry = function(x, y) {
  let c = this.aPlane.get(x, y);
  this._ensurePalette();
  return this.palette.get(c);
}

Scene.prototype.getPaletteAll = function(opt) {
  this._ensurePalette();
  if (opt.sort) {
    let remap = {};
    let vals = [];
    for (let i = 0; i < this.palette.length; i++) {
      let rgb = this.palette[i].rgb;
      remap[rgb.toInt()] = i;
      vals.push(rgb);
    }
    // Remove the first color, treat it as the background
    let bgColor = vals[0];
    vals = vals.slice(1);
    // Sort by HSV
    vals = algorithm.sortByHSV(vals);
    // Put the background color in front
    vals = [bgColor].concat(vals);
    // Build the palette items
    let recolor = {};
    let items = [];
    for (let i = 0; i < vals.length; i++) {
      let orig = remap[vals[i].toInt()];
      let ent = new palette.PaletteEntry(vals[i], i, this.colorSet);
      ent.cval = orig;
      let reset = this.colorSet.get(ent.cval);
      rgbColor.ensureIs(reset);
      ent.rgb = reset;
      recolor[orig] = i;
      items.push(ent);
    }
    // Remap the colors in the data buffer
    let pl = this.aPlane;
    for (let y = 0; y < pl.height; y++) {
      for (let x = 0; x < pl.width; x++) {
        let k = pl.pitch * y + x;
        let c = pl.data[k];
        pl.data[k] = recolor[c];
      }
    }
    // Assigin the palette to the scene
    let saveService = this.saveService;
    let pal = new palette.PaletteCollection(items, saveService);
    this.palette = pal;
  }
  return this.palette;
}

Scene.prototype._ensurePalette = function() {
  if (this.palette == null) {
    let colors = this.colorSet;
    let saveService = this.saveService;
    let all = [];
    for (let i = 0; i < colors.size(); i++) {
      let rgb = colors.get(i);
      rgbColor.ensureIs(rgb);
      let ent = new palette.PaletteEntry(rgb, i, colors);
      all.push(ent);
    }
    this.palette = new palette.PaletteCollection(all, saveService);
  }
}

Scene.prototype.usePalette = function(vals) {
  let colors = this.colorSet;
  let saveService = this.saveService;
  let all = [];
  let ent;
  for (let i = 0; i < vals.length; i++) {
    let cval = vals[i];
    if (cval === null) {
      let rgb = new rgbColor.RGBColor(0);
      ent = new palette.PaletteEntry(rgb, -1, colors);
      ent.isAvail = true;
      all.push(ent);
      continue;
    }
    if (cval >= colors.size()) {
      throw new Error(`illegal color value ${cval}, colorSet only has ${colors.size()}`);
    }
    let rgb = colors.get(cval);
    rgbColor.ensureIs(rgb);
    ent = new palette.PaletteEntry(rgb, cval, colors);
    all.push(ent);
  }
  this.palette = new palette.PaletteCollection(all, saveService);
}

Scene.prototype.useTileset = function(img, sizeInfo) {
  let saveService = this.saveService;
  this.tiles = new tiles.TileSet(img, sizeInfo, saveService);
}

Scene.prototype.render = function(pl) {
  let source = pl.data;
  let sourcePitch = pl.pitch;
  let sourceWidth = pl.width;
  let sourceHeight = pl.height;
  let targetWidth = pl.width;
  let targetHeight = pl.height;
  let targetPitch = pl.width*4;
  let numPoints = pl.height * pl.width;
  let sizeInfo = null;

  if (this.tiles != null) {
    // Assert that useTileset requires usePlane
    if (!this._config.usingNonPrimaryPlane) {
      throw new Error('cannot use tileset without also using plane');
    }
    // Calculate the size
    let tileSize = this.tiles.tileWidth * this.tiles.tileHeight;
    sourceWidth = pl.width * this.tiles.tileWidth;
    sourceHeight = pl.height * this.tiles.tileHeight;
    source = new Uint8Array(numPoints * tileSize);

    for (let yTile = 0; yTile < pl.height; yTile++) {
      for (let xTile = 0; xTile < pl.width; xTile++) {
        let k = yTile*pl.pitch + xTile;
        let c = pl.data[k];
        let t = this.tiles.get(c);
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

    sourcePitch = this.tiles.tileWidth * pl.width;
    targetPitch = sourcePitch*4;
    targetWidth = this.tiles.tileWidth * pl.width;
    targetHeight = this.tiles.tileHeight * pl.height;
    numPoints = numPoints * tileSize;
    sizeInfo = {};
    sizeInfo.width = this.tiles.tileWidth * pl.width;
    sizeInfo.height = this.tiles.tileHeight * pl.height;
    sizeInfo.pitch = targetPitch;
  }

  if (this.rgbBuffer == null) {
    this.rgbBuffer = new Uint8Array(numPoints*4);
  }

  let scrollY = Math.floor(this._config.scrollY || 0);
  let scrollX = Math.floor(this._config.scrollX || 0);
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
  if (this._config.width) {
    this.rgbBuffer.width = this._config.width;
    this.rgbBuffer.pitch = targetPitch;
  }
  if (this._config.height) {
    this.rgbBuffer.height = this._config.height;
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
