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
const rgbColor = require('./rgb_color.js');

////////////////////////////////////////

const FRAMES_LOOP_FOREVER = -1;

function Runner(env) {
  this._addMethods();
  this.resources = env.makeResources();
  this.display = env.makeDisplay();
  this.scene = new scene.Scene(this.resources, env);
  plane.setGlobalScene(this.scene);
  this.aPlane = new plane.Plane();
  this.env = env;
  this._config = {};
  this.numFrames = FRAMES_LOOP_FOREVER;
  this.initialize();
  return this;
}

Runner.prototype.initialize = function () {
  this._config.screenWidth = 100;
  this._config.screenHeight = 100;
  this._config.zoomScale = 1;
  this._config.titleText = '';
  this.scene.colorSet.clear();
  this.imgLoader = new imageLoader.Loader(this.resources, this.scene);
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

Runner.prototype._addMethods = function() {
  let self = this;
  let d = new drawing.Drawing();
  let methods = d.getMethods();
  for (let i = 0; i < methods.length; i++) {
    let [fname, paramSpec, impl] = methods[i];
    this[fname] = function() {
      let args = Array.from(arguments);
      if (paramSpec === undefined) {
        throw new Error(`function ${fname} does not have parameter spec`);
      }
      let realArgs = destructure(paramSpec, [fname, args]);
      self.aPlane[fname].apply(self.aPlane, realArgs);
    }
  }
}

Runner.prototype.resetState = function() {
  this.scene.colorSet.clear();
  this.scene.palette = null;
  this.scene.clearPlane(this.aPlane);
}

Runner.prototype.then = function(cb) {
  this.imgLoader.resolveAll(cb);
}

Runner.prototype.setZoom = function(scale) {
  this._config.zoomScale = scale;
}

Runner.prototype.setTitle = function(title) {
  this._config.titleText = title;
}

Runner.prototype.originAtCenter = function() {
  this.aPlane.setTranslation(0.5);
}

Runner.prototype.useColors = function(obj) {
  return this.scene.colorSet.use(obj);
}

Runner.prototype.appendColors = function(obj) {
  return this.scene.colorSet.append(obj);
}

Runner.prototype.numColors = function() {
  return this.scene.colorSet.size();
}

Runner.prototype.useDisplay = function(nameOrDisplay) {
  if (nameOrDisplay == 'ascii') {
    this.display = new displayAscii.DisplayAscii();
  } else if (this.isDisplayObject(nameOrDisplay)) {
    this.display = nameOrDisplay;
  } else {
    throw `Invalid display "${nameOrDisplay}"`;
  }
  this.display.initialize();
}

Runner.prototype.loadImage = function(filepath, opt) {
  return this.imgLoader.loadImage(filepath, opt);
}

Runner.prototype._doRender = function(num, exitAfter, renderFunc, betweenFunc, finalFunc) {
  let plane = this.aPlane;
  let self = this;
  this.then(function() {
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

Runner.prototype.show = function(finalFunc) {
  this._doRender(1, false, null, null, finalFunc);
}

Runner.prototype.run = function(renderFunc, betweenFrameFunc) {
  this._doRender(this.numFrames, true, renderFunc, betweenFrameFunc, null);
}

Runner.prototype.save = function(savepath) {
  this.aPlane.save(savepath);
}

Runner.prototype.quit = function() {
  this.display.appQuit();
}

Runner.prototype.nextFrame = function() {
  this.aPlane.nextFrame();
}

Runner.prototype.makeShape = function(method, params) {
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

Runner.prototype.setFont = function(filename) {
  let font = this.textLoader.loadFont(filename);
  this.scene.font = font;
}

Runner.prototype.handleEvent = function(eventName, callback) {
  this.display.handleEvent(eventName, callback);
}

Runner.prototype.isDisplayObject = function(obj) {
  let needMethods = ['initialize', 'setSource', 'renderLoop'];
  for (let i = 0; i < needMethods.length; i++) {
    let method = obj[needMethods[i]];
    if (!method || typeof method != 'function') {
      return false;
    }
  }
  return true;
}

Runner.prototype.getPaletteEntry = function(x, y) {
  let c = this.aPlane.get(x, y);
  this._ensurePalette();
  return this.scene.palette.get(c);
}

Runner.prototype.getPaletteAll = function(opt) {
  this._ensurePalette();
  if (opt.sort) {
    let remap = {};
    let vals = [];
    for (let i = 0; i < this.scene.palette.length; i++) {
      let rgb = this.scene.palette[i].rgb;
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
      let ent = new palette.PaletteEntry(vals[i], i, this.scene.colorSet);
      ent.cval = orig;
      let reset = this.scene.colorSet.get(ent.cval);
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
    let saveService = this.scene.saveService;
    let pal = new palette.PaletteCollection(items, saveService);
    this.scene.palette = pal;
  }
  return this.scene.palette;
}

Runner.prototype._ensurePalette = function() {
  if (this.scene.palette == null) {
    let colors = this.scene.colorSet;
    let saveService = this.scene.saveService;
    let all = [];
    for (let i = 0; i < colors.size(); i++) {
      let rgb = colors.get(i);
      rgbColor.ensureIs(rgb);
      let ent = new palette.PaletteEntry(rgb, i, colors);
      all.push(ent);
    }
    this.scene.palette = new palette.PaletteCollection(all, saveService);
  }
}

Runner.prototype.usePalette = function(vals) {
  let colors = this.scene.colorSet;
  let saveService = this.scene.saveService;
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
  this.scene.palette = new palette.PaletteCollection(all, saveService);
}

module.exports.Runner = Runner;
