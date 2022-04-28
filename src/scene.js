const colorSet = require('./color_set.js');
const drawable = require('./drawable.js');
const destructure = require('./destructure.js');
const algorithm = require('./algorithm.js');
const palette = require('./palette.js');
const renderer = require('./renderer.js');
const geometry = require('./geometry.js');
const imageLoader = require('./image_loader.js');
const textLoader = require('./text_loader.js');
const asciiDisplay = require('./ascii_display.js');
const plane = require('./plane.js');
const tiles = require('./tiles.js');
const attributes = require('./attributes.js');
const rgbColor = require('./rgb_color.js');
const types = require('./types.js');
const verboseLogger = require('./verbose_logger.js');

////////////////////////////////////////

const FRAMES_LOOP_FOREVER = -1;

let verbose = new verboseLogger.Logger();

function Scene(env) {
  this._addMethods();
  this.env = env;
  this.fsacc = env.makeFilesysAccess();
  this.display = env.makeDisplay();
  this.saveService = this.fsacc;

  this.renderer = new renderer.Renderer();

  this.colorSet = null;
  this.camera = {};
  this.font = null;
  this.palette = null;
  this.tiles = null;
  this.attrs = null;
  this.interrupts = null;

  this.aPlane = new plane.Plane();
  this.numFrames = FRAMES_LOOP_FOREVER;
  this._initialize();
  return this;
}

Scene.prototype._initialize = function () {
  this._initConfig();
  this.time = 0.0;
  this.timeClick = 0;
  this.TAU = 6.283185307179586;
  this.PI = this.TAU / 2;
  this.camera = {};
  this.colorSet = null;
  this.imgLoader = new imageLoader.Loader(this.fsacc, this);
  this.textLoader = new textLoader.TextLoader(this.fsacc);
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

Scene.prototype.Plane = function() {
  if (new.target === undefined) {
    throw new Error('Plane constructor must be called with `new`');
  }
  let p = new plane.Plane();
  p._addMethods(true);
  return p;
}

Scene.prototype.Tileset = function() {
  if (new.target === undefined) {
    throw new Error('Tileset constructor must be called with `new`');
  }
  let args = arguments;
  // TODO: destructure?
  return new tiles.Tileset(args[0], args[1]);
}

// TODO: Constructors for other components, Attributes, etc ...

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
      if (self.config.translateCenter) {
        self._translateArguments(paramSpec, realArgs);
      }
      self.aPlane[fname].apply(self.aPlane, realArgs);
    }
  }
  this.setColor = function(n) {
    self._ensureColorSet();
    self.aPlane.setColor(n);
  }
  this.fillColor = function(n) {
    self._ensureColorSet();
    self.aPlane.fillColor(n);
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

Scene.prototype._removeAdditionalMethods = function() {
  // TODO: improve this way specific methods are handled
  delete this['setColor'];
  delete this['fillColor'];
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
  this._ensureColorSet();
  let color = this.colorSet.extendWith(rgb);
  this.aPlane.setColor(color);
}

Scene.prototype.fillTrueColor = function(rgb) {
  if (!types.isNumber(rgb)) {
    throw new Error(`fillTrueColor needs rgb as a number, got ${rgb}`);
  }
  this._ensureColorSet();
  let color = this.colorSet.extendWith(rgb);
  this.aPlane.fillColor(color);
}

Scene.prototype.setSize = function(w, h) {
  let spec = ['w:i', 'h?i'];
  [w, h] = destructure.from('setSize', spec, arguments, null);
  if (h === undefined) { h = w; };

  this.width = w;
  this.height = h;
  if (this.aPlane.width == 0 || this.aPlane.height == 0) {
    this.aPlane.setSize(w, h);
  }
  // TODO: allow resizing? Need to understand how display vs plane size
  // interact when one or the other is changed
  this.renderer.clear();
}

Scene.prototype.setScrollX = function(x) {
  this.camera.x = Math.floor(x);
}

Scene.prototype.setScrollY = function(y) {
  this.camera.y = Math.floor(y);
}

Scene.prototype.resetState = function() {
  this.width = null;
  this.height = null;
  this.colorSet = null;
  this.aPlane.clear();
  this.renderer.clear();
  this.fsacc.clear();
  this.time = 0.0;
  this.timeClick = 0;
  this.camera = {};
  this.palette = null;
  this.tiles = null;
  this.attrs = null;
  this.interrupts = null;
  this.rgbBuffer = null;
  this._initConfig();
  this._addMethods();
}

Scene.prototype._initConfig = function() {
  this.config = {
    zoomScale: 1,
    titleText: '',
    translateCenter: false,
    usingNonPrimaryPlane: false,
    gridUnit: null,
  };
}

Scene.prototype.then = function(cb) {
  this.fsacc.whenLoaded(cb);
}

Scene.prototype.setZoom = function(scale) {
  this.config.zoomScale = scale;
}

Scene.prototype.setGrid = function(unit) {
  if (unit) {
    this.display.setGrid(true);
  } else {
    this.display.setGrid(false);
  }
  if (this.config.gridUnit) {
    return;
  }
  this.config.gridUnit = unit;
}

Scene.prototype.setTitle = function(title) {
  this.config.titleText = title;
}

Scene.prototype.originAtCenter = function() {
  this.config.translateCenter = true;
}

Scene.prototype.useColors = function(obj) {
  if (this.colorSet) {
    let name = this.colorSet.name;
    throw new Error(`cannot use colorSet "${obj}", already using "${name}"`);
  }
  this.colorSet = colorSet.constructFrom(obj);
  return this.colorSet;
}

Scene.prototype.useDisplay = function(nameOrDisplay) {
  if (types.isObject(nameOrDisplay)) {
    // NOTE: An experimental feature.
    let opt = nameOrDisplay;
    if (opt.displayElemID) {
      this.display.elemID = opt.displayElemID;
      return;
    }
    throw new Error(`illegal param for useDisplay: ${JSON.stringify(opt)}`);
  }

  if (types.isString(nameOrDisplay)) {
    if (nameOrDisplay == 'ascii') {
      this.display = new asciiDisplay.AsciiDisplay();
    } else {
      throw new Error(`unknown built-in display name "${nameOrDisplay}"`);
    }
  } else {
    this._assertDisplayObject(nameOrDisplay);
    this.display = nameOrDisplay;
  }
  this.display.initialize();
}

// TODO: Re-organize the methods in this file, into topics.

Scene.prototype.insertResource = function(name, imageSurf) {
  if (!types.isSurface(imageSurf)) {
    throw new Error(`insertResource: expects surface`);
  }
  this.imgLoader.insert(name, imageSurf);
}

Scene.prototype.loadImage = function(filepath, opt) {
  return this._makeShape('load', [filepath, opt]);
}

Scene.prototype.makePolygon = function(shape, angle) {
  return this._makeShape('polygon', [shape]);
}

Scene.prototype.rotatePolygon = function(shape, angle) {
  return this._makeShape('rotate', [shape, angle]);
}

Scene.prototype.select = function(x, y, w, h) {
  let spec = ['x:i', 'y:i', 'w:i', 'h:i'];
  [x, y, w, h] = destructure.from('select', spec, arguments, null);
  return this.aPlane.select(x, y, w, h);
}

Scene.prototype._doRender = function(num, exitAfter, drawFunc, finalFunc) {
  let plane = this.aPlane;

  if (!this.width || !this.height) {
    if (!this.tiles) {
      this.width = plane.width;
      this.height = plane.height;
    } else {
      this.width = plane.width * this.tiles.tileWidth;
      this.height = plane.height * this.tiles.tileHeight;
    }
  }
  this.renderer.connect(this.provide());

  let renderID = makeRenderID();

  let self = this;
  self.then(function() {
    self.display.setSize(self.width, self.height);
    self.display.setRenderer(self.renderer);
    self.display.setZoom(self.config.zoomScale);
    self.display.renderLoop(function() {
      if (drawFunc) {
        try {
          drawFunc();
        } catch(e) {
          console.log(e);
          throw e;
        }
      }
      self.nextFrame();
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

Scene.prototype.show = function(drawFunc, finalFunc) {
  this._doRender(1, false, drawFunc, finalFunc);
}

Scene.prototype.run = function(drawFunc) {
  this._doRender(this.numFrames, true, drawFunc, null);
}

Scene.prototype.showFrame = function(callback) {
  this.fillFrame(callback);
  this.show();
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
  var self = this;
  self.then(function() {
    self.timeClick += 1;
    self.time = self.timeClick / 60.0;
    self.aPlane.nextFrame();
  });
}

Scene.prototype.mixColors = function(spec) {
  let result = [];
  let cursor = 0;
  let leftColor = spec[cursor + 1];
  let rightColor = spec[cursor + 3];
  let startIndex = spec[0];
  let targetIndex = spec[2];
  let endIndex = spec[spec.length - 2];
  for (let i = 0; i < endIndex; i++) {
    if (i == targetIndex) {
      cursor += 2;
      startIndex = targetIndex;
      leftColor = spec[cursor + 1];
      rightColor = spec[cursor + 3];
      targetIndex = spec[cursor + 2];
    }
    let L = new rgbColor.RGBColor(leftColor);
    let R = new rgbColor.RGBColor(rightColor);
    let rgb = L.interpolate(R, i, {min: startIndex, max: targetIndex});
    result.push(rgb.toInt());
  }
  return result;
}

Scene.prototype.clonePlane = function() {
  let s = this.aPlane;
  let p = s.clone();
  p.pitch = p.width;
  let numPixels = p.height * p.pitch;
  let newBuff = new Uint8Array(numPixels);
  for (let y = 0; y < p.height; y++) {
    for (let x = 0; x < p.width; x++) {
      let k = y*s.pitch + x;
      let j = y*p.pitch + x;
      newBuff[j] = s.data[k];
    }
  }
  p.data = newBuff;
  return p;
}

Scene.prototype.oscil = function(namedOnly) {
  let spec = ['!name', 'period?i=60', 'begin?n', 'max?n=1.0', 'click?a'];
  let [period, begin, max, click] = destructure.from(
    'oscil', spec, arguments, null);

  period = period || 60;
  if (begin === undefined) {
    begin = 0.0;
  }
  if (click === null) {
    click = this.timeClick;
  }
  click = click + Math.round(period * begin);
  return max * ((1.0 - Math.cos(click * this.TAU / period)) / 2.0000001);
}

Scene.prototype._makeShape = function(method, params) {
  if (method == 'polygon') {
    let pointsOrPolygon = params[0];
    return geometry.convertToPolygon(pointsOrPolygon);
  } else if (method == 'rotate') {
    let [pointsOrPolygon, angle] = params;
    if (angle === null || angle === undefined) {
      angle = this.time;
    }
    let polygon = geometry.convertToPolygon(pointsOrPolygon);
    polygon.rotate(angle);
    return polygon;
  } else if (method == 'load') {
    let [filepath, opt] = params;
    opt = opt || {};
    if (!this.colorSet) {
      verbose.log(`Scene.loadImage: creating an empty colorSet`, 4);
      this.colorSet = colorSet.constructFrom([]);
    }
    return this.imgLoader.loadImage(filepath, opt);
  }
}

Scene.prototype.setFont = function(spec, opt) {
  if (spec.startsWith('font:')) {
    let name = spec.split(':')[1];
    this.font = this.textLoader.createFontResource(name);
  } else {
    let filename = spec;
    this.font = this.textLoader.loadFont(filename, opt);
  }
  this.aPlane.font = this.font;
}

Scene.prototype.setTileset = function(which) {
  if (which < 0 || which >= this.tilesetBanks.length) {
    throw new Error(`invalid tileset number ${which}`);
  }
  this.tiles = this.tilesetBanks[which];
  this.renderer.switchComponent(0, 'tiles', this.tiles);
}

Scene.prototype.on = function(eventName, callback) {
  let allowed = ['keypress', 'click'];
  if (!allowed.includes(eventName)) {
    let expect = allowed.map((n)=>`"${n}"`).join(', ');
    throw new Error(`unknown event "${eventName}", only ${expect} supported`);
  }
  this.display.handleEvent(eventName, callback);
}

Scene.prototype._assertDisplayObject = function(obj) {
  let needMethods = ['initialize',
                     'handleEvent',
                     'setSize',
                     'setRenderer',
                     'setZoom',
                     'setGrid',
                     'renderLoop'];
  let failures = [];
  for (let i = 0; i < needMethods.length; i++) {
    let method = obj[needMethods[i]];
    if (!method || !types.isFunction(method)) {
      failures.push(needMethods[i]);
    }
  }
  if (failures.length) {
    throw new Error(`invalid display: missing ${JSON.stringify(failures)}`);
  }
}

Scene.prototype.resize = function(x, y) {
  return this.aPlane.resize(x, y);
}

Scene.prototype.eyedrop = function(x, y) {
  this._ensureColorSet();
  this._paletteFromColorset();
  let c = this.aPlane.get(x, y);
  return this.palette.get(c);
}

Scene.prototype.get = function(x, y) {
  return this.aPlane.get(x, y);
}

Scene.prototype.put = function(x, y, v) {
  return this.aPlane.put(x, y, v);
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
    verbose.log(`constructing palette from colorSet`, 4);
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
  this._removeAdditionalMethods();
  this.config.usingNonPrimaryPlane = true;
  // TODO: test me
  return this.aPlane;
}

Scene.prototype._ensureColorSet = function() {
  if (!this.colorSet) {
    verbose.log(`creating default colorSet`, 4);
    this.colorSet = colorSet.makeDefault();
  }
}

Scene.prototype.usePalette = function(param) {
  // can be called like this:
  //
  //   // Construct a palette from what was drawn to the plane
  //   ra.usePalette({sort: true});
  //
  //   // List of indicies from the colorset.
  //   ra.usePalette([0x17, 0x21, 0x04, 0x09]);
  //
  //   // Number of colors in the palette.
  //   ra.usePalette(5);
  //
  this._ensureColorSet();
  if (types.isPalette(param)) {
    this.palette = param;
    return this.palette;
  } else if (!param) {
    return this._initPaletteFromPlane();
  } else if (types.isObject(param)) {
    return this._initPaletteFromPlane(param.sort);
  } else if (types.isArray(param)) {
    return this._constructPaletteFromVals(param);
  } else if (types.isInteger(param)) {
    let vals = new Array(param);
    vals.fill(0);
    return this._constructPaletteFromVals(vals);
  }
  throw new Error(`usePalette: unsupported param ${param}`);
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

Scene.prototype.useTileset = function(something, sizeInfo) {
  if (!something) {
    throw new Error(`useTileset expects an argument`);
  }
  if (types.isObject(something) && sizeInfo == null) {
    // Construct a tileset from the current plane.
    sizeInfo = something;
    this.tiles = new tiles.Tileset(this.aPlane, sizeInfo, {dedup: true});
    this.aPlane = this.tiles.patternTable;
  } else if (types.isTileset(something)) {
    this.tiles = something;
  } else if (types.isArray(something)) {
    // TODO: list of Tileset objects
    // TODO: perhaps remove this functionality
    let imageList = something;
    let allBanks = [];
    for (let i = 0; i < imageList.length; i++) {
      let tileset = new tiles.Tileset(imageList[i], sizeInfo);
      allBanks.push(tileset);
    }
    this.tilesetBanks = allBanks;
    this.tiles = allBanks[0];
  } else if (types.isPlane(something)) {
    let img = something;
    this.tiles = new tiles.Tileset(img, sizeInfo);
  } else if (types.isNumber(something)) {
    let numTiles = something;
    this.tiles = new tiles.Tileset(numTiles, sizeInfo);
  } else {
    throw new Error(`cannot construct tileset from ${something}`);
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
  this._ensureColorSet();
  if (this.tiles != null) {
    // Assert that useTileset requires usePlane
    if (!this.config.usingNonPrimaryPlane) {
      throw new Error('cannot use tileset without also using plane');
    }
  }
  let prov = {};
  prov.plane = this.aPlane;
  prov.colorSet = this.colorSet;
  prov.size = {width: this.width, height: this.height};
  if (this.camera) {
    prov.camera = this.camera;
  }
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
  if (this.config.gridUnit) {
    prov.grid = {
      zoom: this.config.zoomScale,
      width: this.width,
      height: this.height,
      unit: this.config.gridUnit,
    }
  }
  return prov;
}

Scene.prototype._saveSurfacesTo = function(surfaces, filename) {
  this.fsacc.saveTo(filename, surfaces);
}

module.exports.Scene = Scene;
