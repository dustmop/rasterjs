const colorSet = require('./color_set.js');
const drawing = require('./drawing.js');
const destructure = require('./destructure.js');
const algorithm = require('./algorithm.js');
const palette = require('./palette.js');
const renderer = require('./renderer.js');
const geometry = require('./geometry.js');
const imageLoader = require('./image_loader.js');
const textLoader = require('./text_loader.js');
const displayAscii = require('./display_ascii.js');
const plane = require('./plane.js');
const scene = require('./scene.js');
const tiles = require('./tiles.js');
const attributes = require('./attributes.js');
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
  this.renderer = new renderer.Renderer(this.colorSet);

  this.font = null;
  this.palette = null;
  this.tiles = null;
  this.attrs = null;
  this.interrupts = null;

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
  plane._prepare();
  this.renderer.plane = plane;
  this.renderer.configure(this);
  let self = this;
  if (!self._config.width || !self._config.height) {
    if (!this.tiles) {
      self._config.width = plane.width;
      self._config.height = plane.height;
    } else {
      self._config.width = plane.width * this.tiles.tileWidth;
      self._config.height = plane.height * this.tiles.tileHeight;
    }
  }
  this.then(function() {
    self.display.setSize(self._config.width, self._config.height);
    self.display.setSource(self.renderer, self._config.zoomScale,
                           self._config.gridUnit);
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
    }, num, exitAfter, finalFunc);
  });
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
  saveService.saveTo(savepath, res.buff, res.width, res.height, res.pitch);
}

Scene.prototype.renderPrimaryPlane = function() {
  let pl = this.aPlane;
  pl._prepare();
  this.renderer.plane = pl;
  this.renderer.configure(this);
  let [width, height] = this.renderer.size();
  let buff = this.renderer.render();
  let pitch = pl.width*4;
  if (buff.pitch) {
    pitch = buff.pitch;
  }
  return {
    buff:   buff,
    width:  width,
    height: height,
    pitch:  pitch,
  };
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
}

Scene.prototype.setTileset = function(which) {
  if (which < 0 || which >= this.tilesetBanks.length) {
    throw new Error(`invalid tileset number ${which}`);
  }
  this.tiles = this.tilesetBanks[which];
  this.renderer.tiles = this.tiles;
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

Scene.prototype.useTileset = function(imgOrTileset, sizeInfo) {
  if (imgOrTileset.constructor.name == 'Tileset') {
    this.tiles = imgOrTileset;
  } else if (Array.isArray(imgOrTileset)) {
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
}

Scene.prototype.useInterrupts = function(conf) {
  if (!Array.isArray(conf)) {
    throw new Error(`useInterrupts param must be an array`);
  }
  let renderPoint = -1;
  for (let k = 0; k < conf.length; k++) {
    let elem = conf[k];
    if (elem.scanline === undefined) {
      throw new Error(`useInterrupts element ${k} missing field 'scanline'`);
    }
    if (elem.scanline.constructor.name != 'Number') {
      throw new Error(`useInterrupts element ${k}.scanline must be number`);
    }
    if (!elem.irq) {
      throw new Error(`useInterrupts element ${k} missing field 'irq'`);
    }
    if (elem.irq.constructor.name != 'Function') {
      throw new Error(`useInterrupts element ${k}.irq must be function`);
    }
    if (elem.scanline < renderPoint) {
      throw new Error(`useInterrupts element ${k}.scanline larger than ${renderPoint}`);
    }
    renderPoint = elem.scanline;
  }
  this.interrupts = conf;
}

module.exports.Scene = Scene;
