const baseDisplay = require('./base_display.js');
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
  this._env = env;
  this._fsacc = env.makeFilesysAccess();
  this._display = null;

  this._renderer = new renderer.Renderer();
  this.palette = null;

  this._font = null;
  this.camera = {};
  this.tileset = null;
  this.attributes = null;
  this.interrupts = null;
  this.spriteList = null;
  this.aPlane = new plane.Plane();

  this._upperPlane = null;
  this._upperCamera = null;
  this._lowerCamera = null;
  this._numFrames = FRAMES_LOOP_FOREVER;

  this._initialize();
  return this;
}

Scene.prototype._initialize = function () {
  this._initConfig();
  this.time = 0.0;
  this.timeTick = 0;
  this.TAU = 6.283185307179586;
  this.PI = this.TAU / 2;
  this.camera = {};
  this._hasRenderedOnce = false;
  this._inspectScanline = null;
  this._inspectCallback = null;
  this.dip = {};
  this.dip.length = 0;

  this._imgLoader = new imageLoader.Loader(this._fsacc, new weak.Ref(this));
  this._textLoader = new textLoader.TextLoader(this._fsacc);
  this._initPalette();

  let options = this._env.getOptions();
  this._numFrames = options.num_frames || -1;
  if (options.display) {
    this.useDisplay(options.display);
  } else {
    // default display
    this._display = this._env.makeDisplay();
  }
  this._display.initialize();
  if (options.colors) {
    this.useColors(options.colors);
  }
  if (options.zoom) {
    this.setZoom(options.zoom);
  }
  if (options.time_tick) {
    this.timeTick = options.time_tick;
    this.time = this.timeTick / 60.0;
  }
  Object.defineProperty(this, 'timeClick', {
    get() {
      throw new Error(`ra.timeClick is invalid, use ra.timeTick instead`);
    }
  });
}

Scene.prototype._initPalette = function() {
  this.palette = new palette.Palette();
  this.palette.giveFeatures(this._fsacc, new weak.Ref(this));
  this.palette.setPending();
}

Scene.prototype.Plane = function() {
  if (new.target === undefined) {
    throw new Error('Plane constructor must be called with `new`');
  }
  let p = new plane.Plane();
  p._addMethods(true);
  return p;
}

Scene.prototype.Display = baseDisplay.BaseDisplay;

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
    self.palette.ensureRGBMap();
    self.aPlane.setColor(n);
  }
  this.fillColor = function(n) {
    self.palette.ensureRGBMap();
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
  this.palette.ensureRGBMap();
  let color = this.palette.addRGBMap(rgb);
  this.aPlane.setColor(color);
}

Scene.prototype.fillTrueColor = function(rgb) {
  rgb = new rgbColor.RGBColor(rgb);
  this.palette.ensureRGBMap();
  let color = this.palette.addRGBMap(rgb);
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
  this._renderer.clear();
}

Scene.prototype.setComponent = function(compname, obj, opts) {
  opts = opts || {};
  if (compname == 'camera') {
    if (!this._lowerCamera) {
      this._lowerCamera = this.camera;
    }
    if (!this._upperCamera) {
      this._upperCamera = {x:0, y:0};
    }
    let layer = opts.layer;
    if (layer == 0) {
      this.camera = this._lowerCamera;
      this._renderer.switchComponent(layer, 'camera', this.camera);
    } else if (layer == 1) {
      this.camera = this._upperCamera;
      this._renderer.switchComponent(layer, 'camera', this.camera);
    }
  }
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
  this.aPlane.clear();
  this._upperPlane = null;
  this._upperCamera = null;
  this._lowerCamera = null;
  this._renderer.clear();
  this._fsacc.clear();
  this.time = 0.0;
  this.timeTick = 0;
  this.camera = {};
  this.tileset = null;
  this.attributes = null;
  this.interrupts = null;
  this.spriteList = null;
  this.rgbBuffer = null;
  this._initPalette();
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
  this._fsacc.whenLoaded(cb);
}

Scene.prototype.setZoom = function(scale) {
  this.config.zoomScale = scale;
}

Scene.prototype.setGrid = function(unit, opt) {
  let enable = !!unit;
  if (opt && opt.enable !== undefined) {
    enable = opt.enable;
  }
  this._display.setGrid(enable);
  if (this.config.gridUnit) {
    return;
  }
  if (!types.isNumber(unit)) {
    unit = 16;
  }
  this.config.gridUnit = unit;

  let width = this.width || this.aPlane.width;
  let height = this.height || this.aPlane.height;

  if (this._renderer) {
    // TODO: It is possible to get here with 0 width and 0 height if
    // setGrid is called before setSize / drawImage.
    this._renderer.grid = {
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
  this.palette.setRGBMap(palette.constructRGBMapFrom(obj));
}

Scene.prototype.useDisplay = function(nameOrDisplay) {
  if (types.isString(nameOrDisplay)) {
    // name of a built-in string
    if (nameOrDisplay == 'ascii') {
      this._display = new asciiDisplay.AsciiDisplay();
    } else {
      this._display = this._env.makeDisplay(nameOrDisplay);
      if (!this._display) {
        throw new Error(`unknown built-in display name "${nameOrDisplay}"`);
      }
    }
  } else if (types.isDisplayObject(nameOrDisplay)) {
    // custom display object
    this._display = nameOrDisplay;
  } else if (types.isObject(nameOrDisplay)) {
    // NOTE: An experimental feature.
    let opt = nameOrDisplay;
    if (opt.displayElemID) {
      this._display.elemID = opt.displayElemID;
      return;
    }
    throw new Error(`illegal param for useDisplay: ${JSON.stringify(opt)}`);
  } else {
    throw new Error(`illegal param for useDisplay: ${JSON.stringify(nameOrDisplay)}`);
  }

  this._display.initialize();
}

// TODO: Re-organize the methods in this file, into topics.

Scene.prototype.insertResource = function(name, imageSurf) {
  if (!types.isSurface(imageSurf)) {
    throw new Error(`insertResource: expects surface`);
  }
  this._imgLoader.insert(name, imageSurf);
}

// NOTE: An experimental feature.
Scene.prototype.experimentalDisplayComponents = function(components, settings) {
  if (this._display.renderAndDisplayEachComponent) {
    this._display.renderAndDisplayEachComponent(components, settings);
  }
}

Scene.prototype.experimentalInspectScanline = function(scanline) {
  this._inspectScanline = scanline;
  if (this._renderer) {
    this._renderer.setInspector(this._inspectScanline, this._inspectCallback);
  }
}

Scene.prototype.loadImage = function(filepath, opt) {
  opt = opt || {};
  return this._imgLoader.loadImage(filepath, opt);
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

Scene.prototype.xform = function(name) {
  return this.aPlane.xform(name);
}

Scene.prototype.fold = function(fname, paramList) {
  let params = {};
  for (let row of paramList) {
    params = Object.assign(params, row);
    this[fname].bind(this).call(this, params);
  }
}

Scene.prototype._doRender = function(num, exitAfter, drawFunc, finalFunc) {
  try {
    this._doRenderSafely(num, exitAfter, drawFunc, finalFunc);
  } catch (e) {
    this._env.handleErrorGracefully(e, this._display);
  }
}

Scene.prototype._doRenderSafely = function(num, exitAfter, drawFunc, finalFunc) {
  let plane = this.aPlane;

  if (!this.width || !this.height) {
    if (!this.tileset) {
      this.width = plane.width;
      this.height = plane.height;
    } else {
      this.width = plane.width * this.tileset.tileWidth;
      this.height = plane.height * this.tileset.tileHeight;
    }
  }
  this._renderer.connect(this.provide());

  if (this.attributes && !this._hasRenderedOnce) {
    this.normalizePaletteAttributes();
    this._hasRenderedOnce = true;
  }

  this._renderer.setInspector(this._inspectScanline, this._inspectCallback);

  let renderID = makeRenderID();

  let self = this;
  self.then(function() {
    self._display.setSize(self.width, self.height);
    self._display.setRenderer(self._renderer);
    self._display.setZoom(self.config.zoomScale);
    self._display.setCallbacks(num, exitAfter, finalFunc);
    self._display.renderLoop(renderID, function() {
      if (drawFunc) {
        drawFunc();
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
  this._doRender(this._numFrames, true, drawFunc, null);
}

Scene.prototype.showFrame = function(callback) {
  this.fillFrame(callback);
  this.show();
}

Scene.prototype.save = function(savepath) {
  let res = this.renderPrimaryPlane();
  if (!this._fsacc) {
    throw new Error('cannot save plane without filesys access');
  }
  this._fsacc.saveTo(savepath, res);
}

Scene.prototype.renderPrimaryPlane = function() {
  this._renderer.connect(this.provide());
  let res = this._renderer.render();
  if (res[0].width == 0 || res[0].height == 0 || res[0].pitch == 0) {
    throw new Error(`invalid scene: ${JSON.stringify(res)}`);
  }
  return res;
}

Scene.prototype.quit = function() {
  this._display.appQuit();
}

Scene.prototype.nextFrame = function() {
  var self = this;
  self.then(function() {
    self.timeTick += 1;
    self.time = self.timeTick / 60.0;
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
  let spec = ['!name', 'period?i=60', 'begin?n', 'max?n=1.0', 'tick?a'];
  let [period, begin, max, tick] = destructure.from(
    'oscil', spec, arguments, null);

  period = period || 60;
  if (begin === undefined) {
    begin = 0.0;
  }
  if (tick === null) {
    tick = this.timeTick;
  }
  tick = tick + Math.round(period * begin);
  return max * ((1.0 - Math.cos(tick * this.TAU / period)) / 2.0000001);
}

Scene.prototype.setFont = function(spec, opt) {
  if (spec.startsWith('font:')) {
    let name = spec.split(':')[1];
    this._font = this._textLoader.createFontResource(name);
  } else {
    let filename = spec;
    this._font = this._textLoader.loadFont(filename, opt);
  }
  this.aPlane.font = this._font;
}

Scene.prototype.setTileset = function(which) {
  // TODO: remove, use setComponent() instead
  if (which < 0 || which >= this.tilesetBanks.length) {
    throw new Error(`invalid tileset number ${which}`);
  }
  this.tileset = this.tilesetBanks[which];
  // TODO:
  this._renderer.switchComponent(0, 'tileset', this.tileset);
}

Scene.prototype.on = function(eventName, callback) {
  let allowed = ['keypress', 'click', 'ready', 'render'];
  if (!allowed.includes(eventName)) {
    let expect = allowed.map((n)=>`"${n}"`).join(', ');
    throw new Error(`unknown event "${eventName}", only ${expect} supported`);
  }
  if (eventName == 'render') {
    this._inspectCallback = callback;
    if (this._renderer) {
      this._renderer.setInspector(this._inspectScanline, this._inspectCallback);
    }
    return;
  }
  this._display.handleEvent(eventName, callback);
}

Scene.prototype.resize = function(x, y) {
  return this.aPlane.resize(x, y);
}

Scene.prototype.eyedrop = function(x, y) {
  // TODO: fix me, test me
  this.palette.ensureRGBMap();
  throw new Error(`TODO: eyedrop`);
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
  return this.dip;
}

Scene.prototype.dipNames = function() {
  return this._dipNames;
}

Scene.prototype._newPaletteFromLookOfImage = function(look) {
  let size = look.max() + 1;
  let items = [];
  for (let i = 0; i < size; i++) {
    items.push(i);
  }
  // Assign the palette to the scene
  this.palette._entries = items;
  // TODO: can we use giveFeatures instead
  this.palette._fsacc = this._fsacc;
  this.palette._refScene = new weak.Ref(this);
  return this.palette;
}

Scene.prototype._newPaletteEntries = function(vals, shouldSort, optSize) {
  this._paletteSetIdentityEntries(optSize);
  // TODO: can we use giveFeatures instead
  this.palette._fsacc = this._fsacc;
  this.palette._refScene = new weak.Ref(this);
  if (vals != null) {
    this.palette._entries = new Array(vals.length).fill(0);
    for (let i = 0; i < vals.length; i++) {
      this.palette._entries[i] = toNum(vals[i]);
    }
  }
  if (shouldSort) {
    let original = {};
    let rgbItems = [];
    for (let i = 0; i < this.palette._rgbmap.length; i++) {
      let rgbval = this.palette._rgbmap[i];
      original[rgbval] = i;
      rgbItems.push(new rgbColor.RGBColor(rgbval));
    }
    // Remove the first color, treat it as the background
    let bgColor = rgbItems[0];
    rgbItems = rgbItems.slice(1);
    // Sort by HSV
    rgbItems = algorithm.sortByHSV(rgbItems);
    // Put the background color in front
    rgbItems = [bgColor].concat(rgbItems);
    // Assign rgbmap
    let newmap = [];
    for (let k = 0; k < rgbItems.length; k++) {
      newmap.push(rgbItems[k].toInt());
    }
    this.palette._rgbmap = newmap;
    // Where did colors move to
    let recolor = {};
    for (let k = 0; k < rgbItems.length; k++) {
      let from = original[rgbItems[k].toInt()];
      recolor[from] = k;
    }
    // Assign the entries to the palette
    for (let i = 0; i < rgbItems.length; i++) {
      this.palette._entries[i] = i;
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
  }
  return this.palette;
}

Scene.prototype._paletteSetIdentityEntries = function(optSize) {
  if (!this.palette) {
    throw new Error(`palette cannot be null!`);
  }
  if (!this.palette._rgbmap) {
    throw new Error(`palette.rgbmap cannot be null!`);
  }
  if (!this.palette._entries) {
    let colors = this.palette._rgbmap;
    let size = optSize || colors.length;
    let items = [];
    for (let i = 0; i < size; i++) {
      items.push(i);
    }
    this.palette._entries = items;
  }
}

Scene.prototype.usePlane = function(pl) {
  if (types.isArray(pl)) {
    // pass
  } else {
    if (!types.isPlane(pl)) {
      throw new Error(`usePlane requires a Plane`);
    }
    pl = [pl];
  }
  this.aPlane = pl[0];
  if (pl.length > 1) {
    this._upperPlane = pl[1];
    this._upperCamera = null;
  }
  this._removeMethods();
  this._removeAdditionalMethods();
  // TODO: test me
  return this.aPlane;
}

Scene.prototype._ensureColorMapPositiveSize = function() {
  throw new Error(`TODO: ensure ColorMap Positive Value`);
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
  if (!this.attributes || !this.palette) {
    throw new Error(`need palette and attributes`);
  }
  // don't ensure the plane is consistent if it is a pattern table
  // TODO: rewrite attributes, it has many problems
  if (!this.tileset) {
    this.attributes.ensureConsistentPlanePalette(this.aPlane, this.palette);
  }
}

Scene.prototype.usePalette = function(param, opt) {
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
  this.palette.ensureRGBMap();
  if (!param) {
    // identity palette entries
    return this._newPaletteEntries(null, false, null);

  } else if (types.isObject(param)) {
    // options for palette entries, sort & size
    return this._newPaletteEntries(null, param.sort, param.size);

  } else if (types.isInteger(param)) {
    // size of the entries list
    let vals = new Array(param).fill(0);
    return this._newPaletteEntries(vals, false, null);

  } else if (types.isArray(param)) {
    // values to use for palette entries
    this._newPaletteEntries(param, false, null);
    if ((opt || {}).agree) {
      this._recolorPlaneToMatchPalette();
    }
    return this.palette;

  } else if (types.isPalette(param)) {
    let keepRGBMap = this.palette._rgbmap || param._rgbmap;
    // copy a palette, keep rgbmap
    // TODO: what about other fields?
    // TODO: what is the actual use case here?
    this.palette = param;
    this.palette._rgbmap = keepRGBMap;
    return this.palette;

  } else if (types.isLookOfImage(param)) {
    // palette entries created from an image.look
    this.palette = this._newPaletteFromLookOfImage(param);
    if (!this.palette._rgbmap) {
      throw new Error(`FIX ME`);
    }
    if (opt && opt.upon) {
      this.palette = this._coverUponPalette(opt.upon, this.palette);
      // coverage implies agreement with me
      this._recolorPlaneToMatchPalette();
      return this.palette;
    }
    return this.palette;
  }

  throw new Error(`usePalette: unsupported param ${param}`);
}

Scene.prototype._recolorPlaneToMatchPalette = function() {
  // TODO: verbose.log here
  this.palette.agreeWithMe(this.aPlane);
}

Scene.prototype._coverUponPalette = function(coverageLook, palette) {
  if (!types.isLookOfImage(coverageLook)) {
    throw new Error(`LookOfImage required, got ${coverageLook}`);
  }
  palette.agreeWithThem(coverageLook);
  palette._rgbmap = this.palette._rgbmap;
  return palette;
}

Scene.prototype.useTileset = function(something, sizeInfo) {
  if (!something) {
    throw new Error(`useTileset expects an argument`);
  }
  if (types.isObject(something) && sizeInfo == null) {
    // Construct a tileset from the current plane.
    sizeInfo = something;
    this.tileset = new tiles.Tileset(this.aPlane, sizeInfo, {dedup: true});
    this.aPlane = this.tileset.patternTable;
  } else if (types.isTileset(something)) {
    this.tileset = something;
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
    this.tileset = allBanks[0];
  } else if (types.isPlane(something)) {
    let img = something;
    this.tileset = new tiles.Tileset(img, sizeInfo);
  } else if (types.isNumber(something)) {
    let numTiles = something;
    this.tileset = new tiles.Tileset(numTiles, sizeInfo);
  } else {
    throw new Error(`cannot construct tileset from ${something}`);
  }
  if (this.attributes) {
    this.attributes.ensureConsistentTileset(this.tileset, this.palette);
  }
  return this.tileset;
}

Scene.prototype.useAttributes = function(pl, sizeInfo) {
  if (!this.palette) {
    // TODO: Attributes without a palette just slices up colorMap
    throw new Error('cannot useAttributes without a palette');
  }
  // TODO: validate sizeInfo
  this.attributes = new attributes.Attributes(pl, this.palette, sizeInfo);
  if (this.tileset) {
    this.attributes.ensureConsistentTileset(this.tileset, this.palette);
  }
  return this.attributes;
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
  let prov = {};
  prov.plane = this.aPlane;
  prov.size = {width: this.width, height: this.height};
  if (this.camera) {
    prov.camera = this.camera;
  }
  if (this.tileset) {
    prov.tileset = this.tileset;
  }
  if (this.palette) {
    prov.palette = this.palette;
  }
  if (this.attributes) {
    prov.attributes = this.attributes;
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
  let res = [prov];
  // Upper layer hack
  if (this._upperPlane) {
    let upper = {};
    upper.plane = this._upperPlane;
    if (this._upperCamera) {
      upper.camera = this._upperCamera;
    }
    res.push(upper);
  }
  return res;
}

Scene.prototype._saveSurfacesTo = function(surfaces, filename) {
  this._fsacc.saveTo(filename, surfaces);
}

Scene.prototype.useSpriteList = function(sprites) {
  // TODO: handle multiple different arguments
  this.spriteList = sprites;
  return this.spriteList;
}

function toNum(n) {
  if (n == null) {
    return 0;
  } else if (types.isNumber(n)) {
    return n;
  } else if (types.isRGBColor(n)) {
    return n.toInt();
  }
  throw new Error(`toNum: unknown type of ${n}`);
}

module.exports.Scene = Scene;
