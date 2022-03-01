const colorSet = require('./color_set.js');
const drawable = require('./drawable.js');
const destructure = require('./destructure.js');
const algorithm = require('./algorithm.js');
const palette = require('./palette.js');
const renderer = require('./renderer.js');
const geometry = require('./geometry.js');
const imageLoader = require('./image_loader.js');
const textLoader = require('./text_loader.js');
const displayAscii = require('./display_ascii.js');
const plane = require('./plane.js');
const tiles = require('./tiles.js');
const attributes = require('./attributes.js');
const rgbColor = require('./rgb_color.js');
const types = require('./types.js');

////////////////////////////////////////

const FRAMES_LOOP_FOREVER = -1;

function Scene(env) {
  this._addMethods();
  this.env = env;
  this.resources = env.makeResources();
  this.display = env.makeDisplay();
  this.saveService = this.resources;

  this.colorSet = new colorSet.Set();
  this.renderer = new renderer.Renderer();

  this.font = null;
  this.palette = null;
  this.tiles = null;
  this.attrs = null;
  this.interrupts = null;

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
  let d = new drawable.Drawable();
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
  let d = new drawable.Drawable();
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

Scene.prototype.setTrueColor = function(rgb) {
  if (!types.isNumber(rgb)) {
    throw new Error(`setTrueColor needs rgb as a number, got ${rgb}`);
  }
  let color = this.colorSet.addEntry(rgb);
  this.aPlane.setColor(color);
}

Scene.prototype.fillTrueColor = function(rgb) {
  if (!types.isNumber(rgb)) {
    throw new Error(`fillTrueColor needs rgb as a number, got ${rgb}`);
  }
  let color = this.colorSet.addEntry(rgb);
  this.aPlane.fillColor(color);
}

Scene.prototype.setSize = function(w, h) {
  this._config.width = w;
  this._config.height = h;
  if (this.aPlane.width == 0 || this.aPlane.height == 0) {
    this.aPlane.setSize(w, h);
  }
  // TODO: allow resizing? Need to understand how display vs plane size
  // interact when one or the other is changed
  this.renderer.clear();
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
  this.renderer.clear();
  this.palette = null;
  this.tiles = null;
  this.attrs = null;
  this.interrupts = null;
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

Scene.prototype.setGrid = function(unit) {
  this._config.gridUnit = unit;
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
  return this.aPlane.select(x, y, w, h);
}

Scene.prototype._doRender = function(num, exitAfter, drawFunc, betweenFunc, finalFunc) {
  let plane = this.aPlane;

  if (!this._config.width || !this._config.height) {
    if (!this.tiles) {
      this._config.width = plane.width;
      this._config.height = plane.height;
    } else {
      this._config.width = plane.width * this.tiles.tileWidth;
      this._config.height = plane.height * this.tiles.tileHeight;
    }
  }
  this.renderer.connect(this.provide());

  let renderID = makeRenderID();

  let self = this;
  self.then(function() {
    self.display.setSize(self._config.width, self._config.height);
    self.display.setRenderer(self.renderer);
    self.display.setZoom(self._config.zoomScale);
    self.display.setGrid(self._config.gridUnit);
    self.display.renderLoop(function() {
      if (drawFunc) {
        try {
          drawFunc();
        } catch(e) {
          console.log(e);
          throw e;
        }
      }
      if (betweenFunc) {
        betweenFunc();
      }
    }, renderID, num, exitAfter, finalFunc);
  });
}

function makeRenderID() {
  let res = '';
  for (let k = 0; k < 20; k++) {
    res += String.fromCharCode(65+Math.floor(Math.random()*26));
  }
  return res;
}

Scene.prototype.show = function(finalFunc) {
  this._doRender(1, false, null, null, finalFunc);
}

Scene.prototype.run = function(drawFunc, betweenFrameFunc) {
  this._doRender(this.numFrames, true, drawFunc, betweenFrameFunc, null);
}

Scene.prototype.save = function(savepath) {
  let res = this.renderPrimaryPlane();
  let saveService = this.saveService;
  if (!saveService) {
    throw new Error('cannot save plane without save service');
  }
  saveService.saveTo(savepath, res);
}

Scene.prototype.renderPrimaryPlane = function() {
  this.renderer.connect(this.provide());
  return this.renderer.render();
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

Scene.prototype.setFont = function(spec) {
  if (spec.startsWith('font:')) {
    let name = spec.split(':')[1];
    this.font = this.textLoader.createFontResource(name);
    return;
  }
  let filename = spec;
  this.font = this.textLoader.loadFont(filename);
  this.aPlane.font = this.font;
}

Scene.prototype.setTileset = function(which) {
  if (which < 0 || which >= this.tilesetBanks.length) {
    throw new Error(`invalid tileset number ${which}`);
  }
  this.tiles = this.tilesetBanks[which];
  this.renderer.switchComponent(0, 'tiles', this.tiles);
}

Scene.prototype.handleEvent = function(eventName, callback) {
  this.display.handleEvent(eventName, callback);
}

Scene.prototype.isDisplayObject = function(obj) {
  let needMethods = ['initialize',
                     'setSize',
                     'setRenderer',
                     'setZoom',
                     'setGrid',
                     'renderLoop'];
  for (let i = 0; i < needMethods.length; i++) {
    let method = obj[needMethods[i]];
    if (!method || !types.isFunction(method)) {
      return false;
    }
  }
  return true;
}

Scene.prototype.eyedrop = function(x, y) {
  let c = this.aPlane.get(x, y);
  this._paletteFromColorset();
  return this.palette.get(c);
}

Scene.prototype._initPaletteFromPlane = function(shouldSort) {
  this._paletteFromColorset();
  if (shouldSort) {
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
    let pal = new palette.Palette(items, saveService);
    this.palette = pal;
  }
  return this.palette;
}

Scene.prototype._paletteFromColorset = function() {
  if (!this.palette) {
    let colors = this.colorSet;
    let saveService = this.saveService;
    let all = [];
    for (let i = 0; i < colors.size(); i++) {
      let rgb = colors.get(i);
      rgbColor.ensureIs(rgb);
      let ent = new palette.PaletteEntry(rgb, i, colors);
      all.push(ent);
    }
    this.palette = new palette.Palette(all, saveService);
  }
  return this.palette;
}

Scene.prototype.usePlane = function(pl) {
  if (!types.isPlane(pl)) {
    throw new Error(`usePlane requires a Plane`);
  }
  this.aPlane = pl;
  this._removeMethods();
  this._config.usingNonPrimaryPlane = true;
  // TODO: test me
  return this.aPlane;
}

Scene.prototype.usePalette = function(optOrVals) {
  optOrVals = optOrVals || {};
  if (types.isObject(optOrVals)) {
    return this._initPaletteFromPlane(optOrVals.sort);
  } else if (types.isArray(optOrVals)) {
    return this._constructPaletteFromVals(optOrVals);
  } else if (types.isInteger(optOrVals)) {
    let vals = new Array(optOrVals);
    vals.fill(0);
    return this._constructPaletteFromVals(vals);
  }
  throw new Error(`usePalette: unsupported param ${optOrVals}`);
}

Scene.prototype._constructPaletteFromVals = function(vals) {
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
  this.palette = new palette.Palette(all, saveService);
  return this.palette;
}

Scene.prototype.useTileset = function(imgOrTileset, sizeInfo) {
  if (!imgOrTileset) {
    throw new Error(`useTileset expects an argument`);
  }
  if (types.isTileset(imgOrTileset)) {
    this.tiles = imgOrTileset;
  } else if (types.isArray(imgOrTileset)) {
    // TODO: list of Tileset objects
    let imageList = imgOrTileset;
    let allBanks = [];
    for (let i = 0; i < imageList.length; i++) {
      let tileset = new tiles.Tileset(imageList[i], sizeInfo);
      allBanks.push(tileset);
    }
    this.tilesetBanks = allBanks;
    this.tiles = allBanks[0];
  } else {
    // TODO: assume this is a Plane
    let img = imgOrTileset;
    this.tiles = new tiles.Tileset(img, sizeInfo);
  }
  if (this.attrs) {
    this.attrs.ensureConsistentTileset(this.tiles, this.palette);
  }
  return this.tiles;
}

Scene.prototype.useAttributes = function(pl, sizeInfo) {
  if (!this.palette) {
    throw new Error('cannot useAttributes without a palette');
  }
  // TODO: validate sizeInfo
  this.attrs = new attributes.Attributes(pl, sizeInfo);
  if (this.tiles) {
    this.attrs.ensureConsistentTileset(this.tiles, this.palette);
  }
  return this.attrs;
}

Scene.prototype.useInterrupts = function(conf) {
  if (types.isArray(conf)) {
    this.interrupts = new renderer.Interrupts(conf);
  } else if (types.isInterrupts(conf)) {
    this.interrupts = conf;
  } else {
    throw new Error(`useInterrupts param must be array or interrupts`);
  }
  return this.interrupts;
}

Scene.prototype.provide = function() {
  let prov = {};
  prov.plane = this.aPlane;
  prov.colorSet = this.colorSet;
  prov.conf = this._config;
  if (this.tiles) {
    prov.tiles = this.tiles;
  }
  if (this.palette) {
    prov.palette = this.palette;
  }
  if (this.attrs) {
    prov.attrs = this.attrs;
  }
  if (this.interrupts) {
    prov.interrupts = this.interrupts;
  }
  return prov;
}

module.exports.Scene = Scene;
