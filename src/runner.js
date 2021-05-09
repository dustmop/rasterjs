const destructure = require('./destructure.js');
const rgbMap = require('./rgb_map.js');
const algorithm = require('./algorithm.js');
const frameMemory = require('./frame_memory.js');
const paletteEntry = require('./palette_entry.js');
const geometry = require('./geometry.js');
const imageLoader = require('./image_loader.js');

////////////////////////////////////////

const D_CLEAN      = 0;
const D_FILL_SOLID = 1;
const D_FILL_DOTS  = 2;
const D_DIRTY      = 3;
const D_DID_FILL   = 4;
const D_DRAWN      = 5;

const MAX_DOTS_DRAWN = 36;

function Runner(env) {
  this.resources = env.makeResources();
  this.display = env.makeDisplay();
  this.aPlane = env.makePlane(this.resources);
  this.env = env;
  this._config = {};
  this.mem = null;
  this._backBuffer = null;
  this.initialize();
  return this;
}

Runner.prototype.initialize = function () {
  this._config.screenWidth = 100;
  this._config.screenHeight = 100;
  this._config.zoomScale = 1;
  this._config.titleText = '';
  this._config.translateX = 0;
  this._config.translateY = 0;
  this._config.bgColor = 0;
  this.dirtyState = D_CLEAN;
  this.dotsDrawn = new Array();
  this.display.initialize();
  this.aPlane.assignRgbMap(rgbMap.rgb_map_default);
  this.imgLoader = new imageLoader.Loader(this.resources);
}

Runner.prototype.resetState = function() {
  this.mem = null;
  this._backBuffer = null;
  this.dirtyState = D_CLEAN;
  this.dotsDrawn = new Array();
  this.aPlane.clear();
  this.aPlane.assignRgbMap(rgbMap.rgb_map_default);
}

Runner.prototype.then = function(cb) {
  cb();
}

Runner.prototype.setSize_params = ['w:i', 'h:i'];
Runner.prototype.setSize = function(w, h) {
  this._config.screenWidth = w;
  this._config.screenHeight = h;
  this.aPlane.setSize(w, h);
}

Runner.prototype.setColor_params = ['color:i'];
Runner.prototype.setColor = function(color) {
  this._config.color = color;
  this.aPlane.setColor(color);
}

Runner.prototype.setTrueColor_params = ['rgb:i'];
Runner.prototype.setTrueColor = function(rgb) {
  let color = this.aPlane.addRgbMapEntry(rgb);
  this.setColor(color);
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
  this._config.translateX = this._config.screenWidth / 2;
  this._config.translateY = this._config.screenHeight / 2;
}

Runner.prototype.useSystemColors_params = ['obj:any'];
Runner.prototype.useSystemColors = function(obj) {
  if (typeof obj == 'string') {
    let text = obj;
    if (text == 'quick') {
      this.aPlane.assignRgbMap(rgbMap.rgb_map_default);
    } else if (text == 'dos') {
      this.aPlane.assignRgbMap(rgbMap.rgb_map_dos);
    } else if (text == 'nes') {
      this.aPlane.assignRgbMap(rgbMap.rgb_map_nes);
    } else if (text == 'grey') {
      this.aPlane.assignRgbMap(rgbMap.rgb_map_grey);
    } else {
      throw 'Unknown system: ' + text;
    }
  } else if (Array.isArray(obj)) {
    let list = obj;
    this.aPlane.assignRgbMap(list);
  } else if (!obj) {
    this.aPlane.clearRgbMap();
  }
}

Runner.prototype.fillBackground_params = ['color:i'];
Runner.prototype.fillBackground = function(color) {
  this._config.bgColor = color;
  this.dirtyState = D_FILL_SOLID;
  this.aPlane.fillBackground(color);
}

Runner.prototype.fillTrueBackground_params = ['rgb:i'];
Runner.prototype.fillTrueBackground = function(tr) {
  this.dirtyState = D_FILL_SOLID; // TODO: This is correct?
  let color = this.aPlane.addRgbMapEntry(tr);
  this.fillBackground(color);
}

Runner.prototype._getTranslation = function() {
  return [this._config.translateX, this._config.translateY];
}

Runner.prototype.drawLine_params = ['x0:i', 'y0:i', 'x1:i', 'y1:i', 'cc?b'];
Runner.prototype.drawLine = function(x0, y0, x1, y1, cc) {
  cc = cc ? 1 : 0;
  let [tx, ty] = this._getTranslation();
  this.dirtyState = D_DIRTY;
  this.aPlane.putLine(tx + x0, ty + y0, tx + x1, ty + y1, cc);
}

Runner.prototype.drawDot_params = ['x:i', 'y:i'];
Runner.prototype.drawDot = function(x, y) {
  let [tx, ty] = this._getTranslation();
  if (this.dirtyState == D_CLEAN || D_FILL_SOLID) {
    this.dirtyState = D_FILL_DOTS;
  }
  if (this.dirtyState == D_FILL_DOTS) {
    this.dotsDrawn.push([tx + x, ty + y, this._config.color]);
  }
  if (this.dotsDrawn.length > MAX_DOTS_DRAWN) {
    this.dirtyState = D_DIRTY;
    this.dotsDrawn.splice(0);
  }
  this.aPlane.putDot(tx + x, ty + y);
}

Runner.prototype.fillSquare_params = ['x:i', 'y:i', 'size:i'];
Runner.prototype.fillSquare = function(x, y, size) {
  let [tx, ty] = this._getTranslation();
  this.dirtyState = D_DIRTY;
  this.aPlane.putRect(tx + x, ty + y, size, size, true);
}

Runner.prototype.drawSquare_params = ['x:i', 'y:i', 'size:i'];
Runner.prototype.drawSquare = function(x, y, size) {
  let [tx, ty] = this._getTranslation();
  this.dirtyState = D_DIRTY;
  this.aPlane.putRect(tx + x, ty + y, size, size, false);
}

Runner.prototype.fillRect_params = ['x:i', 'y:i', 'w:i', 'h:i'];
Runner.prototype.fillRect = function(x, y, w, h) {
  let [tx, ty] = this._getTranslation();
  this.dirtyState = D_DIRTY;
  this.aPlane.putRect(tx + x, ty + y, w, h, true);
}

Runner.prototype.drawRect_params = ['x:i', 'y:i', 'w:i', 'h:i'];
Runner.prototype.drawRect = function(x, y, w, h) {
  let [tx, ty] = this._getTranslation();
  this.dirtyState = D_DIRTY;
  this.aPlane.putRect(tx + x, ty + y, w, h, false);
}

Runner.prototype.fillCircle_params = ['x:i', 'y:i', 'r:i'];
Runner.prototype.fillCircle = function(x, y, r) {
  let [tx, ty] = this._getTranslation();
  this.dirtyState = D_DIRTY;
  let centerX = tx + x + r;
  let centerY = ty + y + r;
  let arc = algorithm.midpointCircleRasterize(r);
  this.aPlane.putCircleFromArc(centerX, centerY, arc, null, true);
}

Runner.prototype.drawCircle_params = ['x:i', 'y:i', 'r:i', 'width?i'];
Runner.prototype.drawCircle = function(x, y, r, width) {
  let [tx, ty] = this._getTranslation();
  this.dirtyState = D_DIRTY;
  let centerX = tx + x + r;
  let centerY = ty + y + r;
  let arc = algorithm.midpointCircleRasterize(r);
  let inner = null;
  if (width) {
    inner = algorithm.midpointCircleRasterize(r - width - 1);
  }
  this.aPlane.putCircleFromArc(centerX, centerY, arc, inner, false);
}

Runner.prototype.fillPolygon_params = ['points:ps', 'x?i', 'y?i'];
Runner.prototype.fillPolygon = function(points, x, y) {
  x = x || 0;
  y = y || 0;
  let [tx, ty] = this._getTranslation();
  this.dirtyState = D_DIRTY;
  this.aPlane.putPolygon(tx + x, ty + y, points, true);
}

Runner.prototype.drawPolygon_params = ['points:ps', 'x?i', 'y?i'];
Runner.prototype.drawPolygon = function(points, x, y) {
  x = x || 0;
  y = y || 0;
  let [tx, ty] = this._getTranslation();
  this.dirtyState = D_DIRTY;
  this.aPlane.putPolygon(tx + x, ty + y, points, false);
}

Runner.prototype.fillFrame_params = ['options?o', 'fillerFunc:f'];
Runner.prototype.fillFrame = function(options, fillerFunc) {
  if (this.mem == null) {
    this.mem = frameMemory.NewFrameMemory(this._config.screenWidth,
                                          this._config.screenHeight);
    if (this.dirtyState == D_CLEAN) {
      this.dirtyState = D_FILL_SOLID;
    }
  }

  if (options && options.previous && !this.mem._didFrame) {
    this.mem.createBackBuffer();
    // If buffer is created from an unknown previous frame, load the contents
    if (this.dirtyState == D_DRAWN) {
      let image = {
        palette: [],
        buffer: [],
        pitch: null,
      };
      this.aPlane.retrieveTrueContent(image);
      for (let k = 0; k < image.buffer.length; k++) {
        this.mem._backBuffer[k] = image.buffer[k];
      }
    }
  }

  // If background color was set, fill the memory
  if (this.dirtyState == D_FILL_SOLID) {
    this.mem.fill(this._config.bgColor);
  }

  // Update the frame memory based upon changes made to the plane.
  if (this.dirtyState == D_FILL_DOTS) {
    for (let i = 0; i < this.dotsDrawn.length; i++) {
      let row = this.dotsDrawn[i];
      let x = row[0];
      let y = row[1];
      this.mem[x + y*this.mem.pitch] = row[2];
    }
    this.dotsDrawn.splice(0);
  } else if (this.dirtyState == D_DIRTY || this.dirtyState == D_DRAWN) {
    let image = {
      palette: [],
      buffer: [],
      pitch: null,
    };
    this.aPlane.retrieveTrueContent(image);
    for (let k = 0; k < image.buffer.length; k++) {
      this.mem[k] = image.buffer[k];
    }
  }
  // Invoke the callback
  if (fillerFunc.length == 1) {
    fillerFunc(this.mem);
  } else if (fillerFunc.length == 3) {
    for (let y = 0; y < this.mem.y_dim; y++) {
      for (let x = 0; x < this.mem.x_dim; x++) {
        let ret = fillerFunc(this.mem, x, y);
        if (ret !== null && ret !== undefined) {
          this.mem[x + y*this.mem.pitch] = ret;
        }
      }
    }
  } else {
    throw 'Invalid arguments for fillFrame: length = ' + fillerFunc.length;
  }
  // Render the frame memory into the plane
  this.dirtyState = D_DID_FILL;
  this.aPlane.putFrameMemory(this.mem);
  this.mem._didFrame = true;
}

Runner.prototype.loadImage = function(filepath) {
  return this.imgLoader.loadBegin(filepath);
}

Runner.prototype.drawImage_params = ['img:a', 'x:i', 'y:i'];
Runner.prototype.drawImage = function(img, x, y) {
  let [tx, ty] = this._getTranslation();
  // TODO: Not just dirty, after drawImage we're not sure if the image
  // is 8-bit safe, or if it now needs trueColor
  this.dirtyState = D_DIRTY;
  this.aPlane.putImage(img, tx + x, ty + y);
}

Runner.prototype.doRender = function(num, renderFunc, betweenFrameFunc) {
  this.display.createWindow(this.aPlane, this._config.zoomScale);
  this.display.appRenderAndLoop(function() {
    if (renderFunc) {
      renderFunc();
    }
    if (betweenFrameFunc) {
      betweenFrameFunc();
    }
  }, num);
}

Runner.prototype.doRenderFile = function(savepath) {
  this.aPlane.saveTo(savepath);
}

Runner.prototype.doQuit = function() {
  this.display.appQuit();
}

Runner.prototype.dispatch = function(row) {
  let fname = row[0];
  let fn = this[fname]
  let param_spec = this[fname + '_params'];
  if (fn === undefined) {
    console.log(`function ${fname} is not defined`);
    throw `function ${fname} is not defined`
  }
  if (param_spec === undefined) {
    console.log(`function ${fname} does not have parameter spec`);
    throw `function ${fname} does not have parameter spec`
  }
  let args = destructure(param_spec, row);
  fn.apply(this, args);
}

Runner.prototype.show = function() {
  this.doRender(1, null, null);
}

Runner.prototype.run = function(renderFunc, betweenFrameFunc) {
  this.doRender(-1, renderFunc, betweenFrameFunc);
}

Runner.prototype.save = function(savepath) {
  this.doRenderFile(savepath);
}

Runner.prototype.quit = function() {
  this.doQuit();
}

Runner.prototype.nextFrame = function() {
  let old = this.dirtyState;
  if (this.dirtyState == D_DID_FILL || this.dirtyState == D_CLEAN) {
    this.dirtyState = D_CLEAN;
  } else {
    this.dirtyState = D_DRAWN;
  }
  if (this.mem) {
    this.mem._didFrame = false;
  }
}

Runner.prototype.makeShape = function(method, params) {
  if (method == 'rotate') {
    let [shape, angle] = params;
    geometry.rotatePolygon(shape, angle);
    return shape;
  } else if (method == 'load') {
    let [filepath] = params;
    return this.loadImage(filepath);
  }
}

Runner.prototype.handleEvent = function(eventName, callback) {
  this.display.handleEvent(eventName, callback);
}

Runner.prototype.getPaletteEntry = function(x, y) {
  let image = {
    palette: [],
    buffer: [],
    pitch: null,
  };
  this.aPlane.retrieveTrueContent(image);
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

Runner.prototype.getPaletteAll = function() {
  let image = {
    palette: [],
    buffer: [],
    pitch: null,
  };
  this.aPlane.retrieveTrueContent(image);

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
    let tr = Math.floor(image.palette[k] / 0x100);
    let ent = new paletteEntry.PaletteEntry(this.aPlane, image.pitch,
                                            index, k, tr);
    all.push(ent);
  }

  return paletteEntry.NewPaletteCollection(this.env, this.resources, all);
}

module.exports.Runner = Runner;
