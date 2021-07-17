const destructure = require('./destructure.js');
const rgbMap = require('./rgb_map.js');
const algorithm = require('./algorithm.js');
const frameMemory = require('./frame_memory.js');
const paletteEntry = require('./palette_entry.js');
const geometry = require('./geometry.js');
const imageLoader = require('./image_loader.js');
const displayAscii = require('./display_ascii.js');
const plane = require('./plane.js');

////////////////////////////////////////

const FRAMES_LOOP_FOREVER = -1;

function Runner(env) {
  this.resources = env.makeResources();
  this.display = env.makeDisplay();
  let rawBuffer = env.makeRawBuffer(this.resources);
  this.aPlane = new plane.Plane(rawBuffer, {saveService: this.resources});
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
  this.aPlane.assignRgbMap(rgbMap.rgb_map_default);
  this.imgLoader = new imageLoader.Loader(this.resources);
  let options = this.env.getOptions();
  this.numFrames = options.num_frames || -1;
  if (options.display) {
    this.display = options.display;
  }
  this.display.initialize();
}

Runner.prototype.resetState = function() {
  this.aPlane.clear();
  this.aPlane.assignRgbMap(rgbMap.rgb_map_default);
}

Runner.prototype.then = function(cb) {
  this.imgLoader.resolveAll(cb);
}

Runner.prototype.setSize_params = ['w:i', 'h:i'];
Runner.prototype.setSize = function(w, h) {
  this.aPlane.setSize(w, h);
}

Runner.prototype.setColor_params = ['color:i'];
Runner.prototype.setColor = function(color) {
  this.aPlane.setColor(color);
}

Runner.prototype.setTrueColor_params = ['rgb:i'];
Runner.prototype.setTrueColor = function(rgb) {
  this.aPlane.setTrueColor(rgb);
}

Runner.prototype.setZoom_params = ['scale:i'];
Runner.prototype.setZoom = function(scale) {
  this._config.zoomScale = scale;
}

Runner.prototype.setTitle_params = ['title:i'];
Runner.prototype.setTitle = function(title) {
  this._config.titleText = title;
}

Runner.prototype.originAtCenter_params = [];
Runner.prototype.originAtCenter = function() {
  this.aPlane.setTranslation(0.5);
}

Runner.prototype.useColors_params = ['obj:any'];
Runner.prototype.useColors = function(obj) {
  if (typeof obj == 'string') {
    let text = obj;
    if (text == 'quick') {
      this.aPlane.assignRgbMap(rgbMap.rgb_map_default);
    } else if (text == 'dos') {
      this.aPlane.assignRgbMap(rgbMap.rgb_map_dos);
    } else if (text == 'nes') {
      this.aPlane.assignRgbMap(rgbMap.rgb_map_nes);
    } else if (text == 'gameboy') {
      this.aPlane.assignRgbMap(rgbMap.rgb_map_gameboy);
    } else if (text == 'pico8') {
      this.aPlane.assignRgbMap(rgbMap.rgb_map_pico8);
    } else if (text == 'zx-spectrum') {
      this.aPlane.assignRgbMap(rgbMap.rgb_map_zx_spectrum);
    } else if (text == 'grey') {
      this.aPlane.assignRgbMap(rgbMap.rgb_map_grey);
    } else {
      throw 'Unknown system: ' + text;
    }
  } else if (Array.isArray(obj)) {
    let list = obj;
    this.aPlane.assignRgbMap(list);
  } else if (!obj) {
    this.aPlane.assignRgbMap([]);
  }
}

Runner.prototype.useDisplay_params = ['name:s'];
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

Runner.prototype.fillBackground_params = ['color:i'];
Runner.prototype.fillBackground = function(color) {
  this.aPlane.fillBackground(color);
}

Runner.prototype.fillTrueBackground_params = ['rgb:i'];
Runner.prototype.fillTrueBackground = function(rgb) {
  this.aPlane.fillTrueBackground(rgb);
}

Runner.prototype.drawLine_params = ['x0:i', 'y0:i', 'x1:i', 'y1:i', 'cc?b'];
Runner.prototype.drawLine = function(x0, y0, x1, y1, cc) {
  this.aPlane.drawLine(x0, y0, x1, y1, cc);
}

Runner.prototype.drawDot_params = ['x:i', 'y:i'];
Runner.prototype.drawDot = function(x, y) {
  this.aPlane.drawDot(x, y);
}

Runner.prototype.fillDot_params = ['dots:any'];
Runner.prototype.fillDot = function(dots) {
  this.aPlane.fillDot(dots);
}

Runner.prototype.fillSquare_params = ['x:i', 'y:i', 'size:i'];
Runner.prototype.fillSquare = function(x, y, size) {
  this.aPlane.fillSquare(x, y, size);
}

Runner.prototype.drawSquare_params = ['x:i', 'y:i', 'size:i'];
Runner.prototype.drawSquare = function(x, y, size) {
  this.aPlane.drawSquare(x, y, size);
}

Runner.prototype.fillRect_params = ['x:i', 'y:i', 'w:i', 'h:i'];
Runner.prototype.fillRect = function(x, y, w, h) {
  this.aPlane.fillRect(x, y, w, h);
}

Runner.prototype.drawRect_params = ['x:i', 'y:i', 'w:i', 'h:i'];
Runner.prototype.drawRect = function(x, y, w, h) {
  this.aPlane.drawRect(x, y, w, h);
}

Runner.prototype.fillCircle_params = ['x:i', 'y:i', 'r:i'];
Runner.prototype.fillCircle = function(x, y, r) {
  this.aPlane.fillCircle(x, y, r);
}

Runner.prototype.drawCircle_params = ['x:i', 'y:i', 'r:i', 'width?i'];
Runner.prototype.drawCircle = function(x, y, r, width) {
  this.aPlane.drawCircle(x, y, r, width);
}

Runner.prototype.fillPolygon_params = ['points:ps', 'x?i', 'y?i'];
Runner.prototype.fillPolygon = function(polygon, x, y) {
  this.aPlane.fillPolygon(polygon, x, y);
}

Runner.prototype.drawPolygon_params = ['points:ps', 'x?i', 'y?i'];
Runner.prototype.drawPolygon = function(polygon, x, y) {
  this.aPlane.drawPolygon(polygon, x, y);
}

Runner.prototype.fillFlood_params = ['x:i', 'y:i'];
Runner.prototype.fillFlood = function(x, y) {
  this.aPlane.fillFlood(x, y);
}

Runner.prototype.fillFrame_params = ['options?o', 'fillerFunc:f'];
Runner.prototype.fillFrame = function(options, fillerFunc) {
  this.aPlane.fillFrame(options, fillerFunc);
}

Runner.prototype.loadImage = function(filepath) {
  return this.imgLoader.loadImage(filepath);
}

Runner.prototype.drawImage_params = ['img:a', 'x:i', 'y:i'];
Runner.prototype.drawImage = function(img, x, y) {
  this.aPlane.drawImage(img, x, y);
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

Runner.prototype.dispatch = function(row) {
  let fname = row[0];
  let fn = this[fname]
  let param_spec = this[fname + '_params'];
  if (fn === undefined) {
    throw new Error(`function ${fname} is not defined`);
  }
  if (param_spec === undefined) {
    throw new Error(`function ${fname} does not have parameter spec`);
  }
  let args = destructure(param_spec, row);
  fn.apply(this, args);
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
    let rgb = Math.floor(image.palette[k] / 0x100);
    let ent = new paletteEntry.PaletteEntry(this.aPlane, image.pitch,
                                            index, k, rgb);
    all.push(ent);
  }

  return new paletteEntry.PaletteCollection(this.env, this.resources, all);
}

module.exports.Runner = Runner;
