const colorMap = require('./color_map.js');
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
const sprites = require('./sprites.js');
const attributes = require('./attributes.js');
const interrupts = require('./interrupts.js');
const rgbColor = require('./rgb_color.js');
const types = require('./types.js');
const weak = require('./weak.js');
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

  this.colorMap = null;
  this.camera = {};
  this.font = null;
  this.palette = null;
  this.tiles = null;
  this.attrs = null;
  this.interrupts = null;
  this.spriteList = null;

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
  this.colorMap = null;
  this._hasRenderedOnce = false;
  this._inspectScanline = null;
  this._inspectCallback = null;
  this.dip = {};
  this.dip.length = 0;
  this.imgLoader = new imageLoader.Loader(this.fsacc, new weak.Ref(this));
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

Scene.prototype.SpriteList = function() {
  if (new.target === undefined) {
    throw new Error('SpriteList constructor must be called with `new`');
  }
  let args = arguments;
  return new sprites.SpriteList(args[0], args[1]);
}

Scene.prototype.SpriteSheet = function() {
  if (new.target === undefined) {
    throw new Error('SpriteSheet constructor must be called with `new`');
  }
  let args = arguments;
  return new sprites.SpriteSheet(args[0], args[1]);
}

Scene.prototype.RGBColor = function(_many) {
  if (new.target === undefined) {
    throw new Error('SpriteSheet constructor must be called with `new`');
  }
  let args = arguments;
  return new rgbColor.RGBColor(args[0], args[1], args[2]);
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
    self._ensureColorMap();
    self.aPlane.setColor(n);
  }
  this.fillColor = function(n) {
    self._ensureColorMap();
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
  rgb = new rgbColor.RGBColor(rgb);
  this._ensureColorMap();
  let color = this.colorMap.extendWith(rgb);
  this.aPlane.setColor(color);
}

Scene.prototype.fillTrueColor = function(rgb) {
  rgb = new rgbColor.RGBColor(rgb);
  this._ensureColorMap();
  let color = this.colorMap.extendWith(rgb);
  this.aPlane.fillColor(color);
}

Scene.prototype.setSize = function(w, h, opt) {
  let spec = ['w:i', 'h?i', 'opt?any'];
  [w, h, opt] = destructure.from('setSize', spec, arguments, null);
  if (h === undefined) { h = w; };
  opt = opt || {};

  if (!opt.planeOnly) {
    this.width = w;
    this.height = h;
  }
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
  this.colorMap = null;
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
  this.spriteList = null;
  this.rgbBuffer = null;
  this._initConfig();
  this._addMethods();
}

Scene.prototype._initConfig = function() {
  this.config = {
    zoomScale: 1,
    titleText: '',
    translateCenter: false,
    gridUnit: null,
  };
}

Scene.prototype.then = function(cb) {
  this.fsacc.whenLoaded(cb);
}

Scene.prototype.setZoom = function(scale) {
  this.config.zoomScale = scale;
}

Scene.prototype.setGrid = function(unit, opt) {
  let enable = !!unit;
  if (opt && opt.enable !== undefined) {
    enable = opt.enable;
  }
  this.display.setGrid(enable);
  if (this.config.gridUnit) {
    return;
  }
  if (!types.isNumber(unit)) {
    unit = 16;
  }
  this.config.gridUnit = unit;

  let width = this.width || this.aPlane.width;
  let height = this.height || this.aPlane.height;

  if (this.renderer) {
    // TODO: It is possible to get here with 0 width and 0 height if
    // setGrid is called before setSize / drawImage.
    this.renderer.grid = {
      zoom: this.config.zoomScale,
      width: width,
      height: height,
      unit: this.config.gridUnit,
    };
  }
}

Scene.prototype.setTitle = function(title) {
  this.config.titleText = title;
}

Scene.prototype.originAtCenter = function() {
  this.config.translateCenter = true;
}

Scene.prototype.useColors = function(obj) {
  if (this.colorMap) {
    let name = this.colorMap.name;
    throw new Error(`cannot use colorMap "${obj}", already using "${name}"`);
  }
  this.colorMap = colorMap.constructFrom(obj);
  return this.colorMap;
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

// NOTE: An experimental feature.
Scene.prototype.experimentalDisplayComponents = function(components, settings) {
  if (this.display.renderAndDisplayEachComponent) {
    this.display.renderAndDisplayEachComponent(components, settings);
  }
}

Scene.prototype.experimentalInspectScanline = function(scanline) {
  this._inspectScanline = scanline;
  if (this.renderer) {
    this.renderer.setInspector(this._inspectScanline, this._inspectCallback);
  }
}

Scene.prototype.loadImage = function(filepath, opt) {
  opt = opt || {};
  if (!this.colorMap) {
    verbose.log(`Scene.loadImage: creating an empty colorMap`, 4);
    this.colorMap = colorMap.constructFrom([]);
  }
  return this.imgLoader.loadImage(filepath, opt);
}

Scene.prototype.makePolygon = function(pointsOrPolygon) {
  return geometry.convertToPolygon(pointsOrPolygon);
}

Scene.prototype.rotatePolygon = function(pointsOrPolygon, angle) {
  if (angle === null || angle === undefined) {
    angle = this.time;
  }
  let polygon = geometry.convertToPolygon(pointsOrPolygon);
  polygon.rotate(angle);
  return polygon;
}

Scene.prototype.select = function(x, y, w, h) {
  let spec = ['x:i', 'y:i', 'w:i', 'h:i'];
  [x, y, w, h] = destructure.from('select', spec, arguments, null);
  return this.aPlane.select(x, y, w, h);
}

Scene.prototype.fold = function(fname, paramList) {
  let params = {};
  for (let row of paramList) {
    params = Object.assign(params, row);
    this[fname].bind(this).call(this, params);
  }
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

  if (this.attrs && !this._hasRenderedOnce) {
    // TODO: Instead of only doing this once, do it every
    // frame but make it efficient.
    this.normalizePaletteAttributes();
    this._hasRenderedOnce = true;
  }

  this.renderer.setInspector(this._inspectScanline, this._inspectCallback);

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
  let res = this.renderer.render();
  if (res[0].width == 0 || res[0].height == 0 || res[0].pitch == 0) {
    throw new Error(`invalid scene: ${JSON.stringify(res)}`);
  }
  return res;
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
  let allowed = ['keypress', 'click', 'ready', 'render'];
  if (!allowed.includes(eventName)) {
    let expect = allowed.map((n)=>`"${n}"`).join(', ');
    throw new Error(`unknown event "${eventName}", only ${expect} supported`);
  }
  if (eventName == 'render') {
    this._inspectCallback = callback;
    if (this.renderer) {
      this.renderer.setInspector(this._inspectScanline, this._inspectCallback);
    }
    return;
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
  for (let methodName of needMethods) {
    let method = obj[methodName];
    if (!method || !types.isFunction(method)) {
      failures.push(methodName);
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
  this._ensureColorMap();
  this._paletteFromColorMap();
  let c = this.aPlane.get(x, y);
  return this.palette.get(c);
}

Scene.prototype.get = function(x, y) {
  return this.aPlane.get(x, y);
}

Scene.prototype.put = function(x, y, v) {
  return this.aPlane.put(x, y, v);
}

Scene.prototype.nge = function() {
  let spec = ['start:i', 'length?i'];
  [start, length] = destructure.from('nge', spec, arguments, null);
  return Array.from(new Array(length), (x,i) => i+start)
}

Scene.prototype.useDips = function(names) {
  this._dipNames = names;
  let make = {};
  for (let n of names) {
    make[n] = true;
  }
  this.dip = make;
  this.dip.length = names.length;
}

Scene.prototype.dipNames = function() {
  return this._dipNames;
}

Scene.prototype._initPaletteFromLookOfImage = function(look) {
  let size = look.max() + 1;
  let items = [];
  for (let i = 0; i < size; i++) {
    let rgb = new rgbColor.RGBColor(this.colorMap.get(i));
    let ent = new palette.PaletteEntry(rgb, i, this.colorMap);
    items.push(ent);
  }
  // Assign the palette to the scene
  let saveService = this.saveService;
  let pal = new palette.Palette(items, saveService, new weak.Ref(this));
  this.palette = pal;
  return this.palette;
}

Scene.prototype._initPaletteFromPlane = function(shouldSort, optSize) {
  this._paletteFromColorMap(optSize);
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
      let ent = new palette.PaletteEntry(vals[i], i, this.colorMap);
      ent.cval = orig;
      let reset = this.colorMap.get(ent.cval);
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
    let pal = new palette.Palette(items, saveService, new weak.Ref(this));
    this.palette = pal;
  }
  return this.palette;
}

Scene.prototype._paletteFromColorMap = function(optSize) {
  if (!this.palette) {
    verbose.log(`constructing palette from colorMap`, 4);
    let colors = this.colorMap;
    let size = optSize || colors.size();
    let saveService = this.saveService;
    let all = [];
    for (let i = 0; i < size; i++) {
      let rgb = colors.get(i);
      rgbColor.ensureIs(rgb);
      let ent = new palette.PaletteEntry(rgb, i, colors);
      all.push(ent);
    }
    this.palette = new palette.Palette(all, saveService, new weak.Ref(this));
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
  // TODO: test me
  return this.aPlane;
}

Scene.prototype._ensureColorMap = function() {
  if (!this.colorMap) {
    verbose.log(`creating default colorMap`, 4);
    this.colorMap = colorMap.makeDefault();
  }
}

Scene.prototype._ensureColorMapPositiveSize = function() {
  // NOTE: from Scene._makeShape, loading an image will
  // construct an empty colorMap and assign it to the scene. Once
  // the image loads, it will fill the colorMap with colors. But
  // before then, in an async environment, calling this should
  // fail because the colorMap is empty.
  if (this.colorMap.size() == 0) {
    throw new Error(`empty colorMap, wait for images to load`)
  }
}

Scene.prototype.normalizePaletteAttributes = function() {
  if (!this.attrs || !this.palette) {
    throw new Error(`need palette and attributes`);
  }
  this.attrs.ensureConsistentPlanePalette(this.aPlane, this.palette);
}

Scene.prototype.usePalette = function(param) {
  // can be called like this:
  //
  //   // Construct a palette from what was drawn to the plane
  //   ra.usePalette();
  //
  //   // Same, but sort the palette by hsv
  //   ra.usePalette({sort: true});
  //
  //   // ...
  //   ra.usePalette({size: 4});
  //
  //   // List of indicies from the colorMap.
  //   ra.usePalette([0x17, 0x21, 0x04, 0x09]);
  //
  //   // Number of colors in the palette.
  //   ra.usePalette(5);
  //
  this._ensureColorMap();
  this._ensureColorMapPositiveSize();
  if (types.isPalette(param)) {
    this.palette = param;
    return this.palette;
  } else if (types.isLookOfImage(param)) {
    return this._initPaletteFromLookOfImage(param);
  } else if (!param) {
    return this._initPaletteFromPlane();
  } else if (types.isObject(param)) {
    return this._initPaletteFromPlane(param.sort, param.size);
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
  let colors = this.colorMap;
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
      throw new Error(`illegal color value ${cval}, colorMap only has ${colors.size()}`);
    }
    let rgb = colors.get(cval);
    rgbColor.ensureIs(rgb);
    ent = new palette.PaletteEntry(rgb, cval, colors);
    all.push(ent);
  }
  this.palette = new palette.Palette(all, saveService, new weak.Ref(this));
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
    this.interrupts = new interrupts.Interrupts(conf, new weak.Ref(this));
  } else if (types.isInterrupts(conf)) {
    this.interrupts = conf;
  } else {
    throw new Error(`useInterrupts param must be array or interrupts`);
  }
  return this.interrupts;
}

Scene.prototype.provide = function() {
  this._ensureColorMap();
  let prov = {};
  prov.plane = this.aPlane;
  prov.colorMap = this.colorMap;
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
  if (this.spriteList) {
    prov.spriteList = this.spriteList;
  }
  return prov;
}

Scene.prototype._saveSurfacesTo = function(surfaces, filename) {
  this.fsacc.saveTo(filename, surfaces);
}

Scene.prototype.useSpriteList = function(sprites) {
  this.spriteList = sprites;
}

module.exports.Scene = Scene;
