const drawing = require('./drawing.js');
const destructure = require('./destructure.js');
const algorithm = require('./algorithm.js');
const paletteEntry = require('./palette_entry.js');
const geometry = require('./geometry.js');
const imageLoader = require('./image_loader.js');
const textLoader = require('./text_loader.js');
const displayAscii = require('./display_ascii.js');
const plane = require('./plane.js');
const scene = require('./scene.js');

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
  this.imgLoader = new imageLoader.Loader(this.resources);
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
  this.scene.colorSet.use(obj);
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

Runner.prototype.loadImage = function(filepath) {
  return this.imgLoader.loadImage(filepath);
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
    let [filepath] = params;
    return this.loadImage(filepath);
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
  let image = {
    palette: [],
    buffer: [],
    pitch: null,
  };
  this.aPlane.rawBuffer.retrieveTrueContent(image);
  if (!image.buffer.length) {
    throw 'cannot getPaletteEntry with an empty plane';
  }

  // Build index from each 8-bt color to where it is used in the plane
  let index = {};
  for (let k = 0; k < image.buffer.length; k++) {
    let color = image.buffer[k];
    if (index[color] === undefined) {
      index[color] = [];
    }
    index[color].push(k);
  }

  let pitch = image.pitch;
  let color = image.buffer[x + y*pitch];
  let tr = image.palette[color];

  return new paletteEntry.PaletteEntry(this.aPlane, pitch,
                                       index, color, tr);
}

Runner.prototype.getPaletteAll = function(opt) {
  opt = opt || {};
  let image = {
    palette: [],
    buffer: [],
    pitch: null,
  };
  this.aPlane.rawBuffer.retrieveTrueContent(image);

  if (opt.sort) {
    algorithm.sortByHSV(image);
  }

  let index = {};
  for (let k = 0; k < image.buffer.length; k++) {
    let color = image.buffer[k];
    if (index[color] === undefined) {
      index[color] = [];
    }
    index[color].push(k);
  }

  let all = [];
  for (let k = 0; k < image.palette.length; k++) {
    let rgb = Math.floor(image.palette[k]);
    let ent = new paletteEntry.PaletteEntry(this.aPlane, image.pitch,
                                            index, k, rgb);
    all.push(ent);
  }

  return new paletteEntry.PaletteCollection(all);
}

module.exports.Runner = Runner;
