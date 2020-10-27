
// Detect whether running in browser or node.js
var createBackendRenderer;
var isRunningNodejs;
if (typeof window === 'undefined') {
  isRunningNodejs = true;
} else {
  isRunningNodejs = false;
}

////////////////////////////////////////
// Pick which backend renderer to use

if (isRunningNodejs) {
  // TODO: Parse command-line arguments
  if (process.argv.length > 2 && process.argv[2] == '--gif') {
    let numFrames = 64;
    if (process.argv.length > 4 && process.argv[3] == '--num-frames') {
      numFrames = parseInt(process.argv[4], 10);
    }
    createBackendRenderer = function(callback) {
      const gifRenderer = require('./gif_renderer.js');
      const rgbMapNES = require('./rgb_map_nes.js');
      let thisFilename = process.argv[1];
      var r = gifRenderer.make(thisFilename, {numFrames: numFrames});
      setTimeout(function() {
        callback(r, rgbMapNES.rgb_mapping);
      }, 0);
    }
  } else {
    createBackendRenderer = function(callback) {
      const cppmodule = require('../build/Release/native');
      const rgbMapNES = require('./rgb_map_nes.js');
      callback(cppmodule(), rgbMapNES.rgb_mapping);
    }
  }
} else {
  // Running in browser
  var loadScript;
  createBackendRenderer = function(callback) {
    loadScript = function(filename, whenLoadedCallback) {
      if (whenLoadedCallback === undefined) {
        throw 'loadScript needs to be given a callback'
      }
      var js = document.createElement('script');
      js.type = 'text/javascript';
      js.src = filename;
      js.onload = function() {
        whenLoadedCallback();
      }
      document.body.appendChild(js);
    };
    setTimeout(function() {
      loadScript('html_renderer.js', function() {
        loadScript('rgb_map_nes.js', function() {
          setTimeout(function() {
            callback(htmlRendererMake(), rgb_mapping);
          }, 16);
        });
      });
    }, 0);
  };
}

////////////////////////////////////////
// Utiliies

function arrayEquals(left, rite) {
  if (left.length !== rite.length) {
    return false;
  }
  for (let i = 0; i < left.length; i++) {
    if (left[i] !== rite[i]) {
      return false;
    }
  }
  return true;
}

function rotatePolygon(polygon, angle) {
  var axis = centerOf(polygon);

  for (var i = 0; i < polygon.length; i++) {
    var x = polygon[i][0];
    var y = polygon[i][1];
    x = x - axis[0];
    y = y - axis[1];

    var rot_x = x * Math.cos(angle) - y * Math.sin(angle);
    var rot_y = x * Math.sin(angle) + y * Math.cos(angle);

    polygon[i][0] = rot_x + axis[0];
    polygon[i][1] = rot_y + axis[1];
  }
}

function centerOf(polygon) {
  var left  = polygon[0][0];
  var top   = polygon[0][1];
  var right = polygon[0][0];
  var bot   = polygon[0][1];
  for (var i = 1; i < polygon.length; i++) {
    var p = polygon[i];
    if (p[0] < left) {
      left = p[0];
    }
    if (p[0] > right) {
      right = p[0];
    }
    if (p[1] < top) {
      top = p[1];
    }
    if (p[1] > bot) {
      bot = p[1];
    }
  }
  return [(left+right)/2, (top+bot)/2];
}

function isObject(thing) {
  if (thing === null) {
    return false;
  }
  return (typeof thing === 'object' && !Array.isArray(thing));
}

function destructure(first_param, args, fields) {
  let caller = destructure.caller;
  if (args.length != 1 || !isObject(first_param)) {
    // Normal list of unnamed parameters passed to the function.
    if (args.length != fields.length) {
      throw 'destructure: function "' + caller.name + '" expected ' + fields.length + ' arguments, got ' + args.length;
    }
    return args;
  }
  // Object containing named parameters passed to the function.
  let result = [];
  let haveKeys = Object.keys(first_param);
  for (let i = 0; i < fields.length; i++) {
    let f = fields[i];
    let pos = haveKeys.indexOf(f);
    if (pos == -1) {
      throw 'destructure: function "' + caller.name + '" needs parameter "' + f + '"';
    }
    haveKeys.splice(pos, 1);
    result.push(first_param[f]);
  }
  // Validate there's no unknown parameters passed to the function.
  if (haveKeys.length == 1) {
    let f = haveKeys[0];
    throw 'destructure: function "' + caller.name + '" unknown parameter "' + f + '"';
  } else if (haveKeys.length > 1) {
    throw 'destructure: function "' + caller.name + '" unknown parameters "' + haveKeys + '"';
  }
  return result;
}

function concatArray(first, remain) {
  let make = new Array();
  make.push(first);
  for (let i = 0; i < remain.length; i++) {
    make.push(remain[i]);
  }
  return make;
}

const TAU = 6.283185307179586;

////////////////////////////////////////
// private state

var _state = {
  config: {},
  images: [],
  isExec: false,
  frameFunc: null,
  backendRenderer: null,
  timeClick: null,
};

////////////////////////////////////////
// queue renderer

function QueueRenderer() {
  this._queue = [];
  return this;
}

QueueRenderer.prototype.queue = function() {
  return this._queue;
}

QueueRenderer.prototype.fillBackground = function() {
  this._queue.push(concatArray('fillBackground', arguments));
}

QueueRenderer.prototype.setColor = function() {
  this._queue.push(concatArray('setColor', arguments));
}

QueueRenderer.prototype.drawLine = function() {
  this._queue.push(concatArray('drawLine', arguments));
}

QueueRenderer.prototype.drawPoint = function() {
  this._queue.push(concatArray('drawPoint', arguments));
}

QueueRenderer.prototype.drawCircleFromArc = function() {
  this._queue.push(concatArray('drawCircleFromArc', arguments));
}

////////////////////////////////////////
// QImage

function QImage(filename) {
  this.filename = filename;
  this.isOpen = false;
  this.img = null;
  this.id = null;
  return this;
}

////////////////////////////////////////
// primary object

function Raster() {
  _state.backendRenderer = new QueueRenderer();
  return this;
}

Raster.prototype.TAU = TAU;

Raster.prototype.setViewportSize = function(params) {
  if (_state.isExec) {
    throw 'Cannot setViewportSize when app is running';
  }
  let [w, h] = destructure(params, arguments, ['w', 'h']);
  _state.config.screenWidth = w;
  _state.config.screenHeight = h;
}

Raster.prototype.setPixelScale = function(s) {
  if (_state.isExec) {
    throw 'Cannot setPixelScale when app is running';
  }
  _state.config.scale = s;
}

Raster.prototype.originAtCenter = function() {
  if (_state.isExec) {
    throw 'Cannot originAtCenter when app is running';
  }
  _state.config.translateCenter = true;
}

Raster.prototype.loadImage = function(path) {
  var i = new QImage(path);
  i.id = _state.images.length;
  _state.images.push(i);
  return i;
};

Raster.prototype.run = function(renderFunc) {
  _state.renderFunc = renderFunc;
  _state.timeClick = 0;
  _state.config.translateX = 0;
  _state.config.translateY = 0;
  if (_state.config.translateCenter) {
    _state.config.translateX = _state.config.screenWidth / 2;
    _state.config.translateY = _state.config.screenHeight / 2;
  }
  _state.isExec = true;
  var self = this;
  createBackendRenderer(function(r, map) {
    _state.backendRenderer = r;
    _state.backendRenderer.assignRgbMapping(map);
    self._allImagesOpen();
    self.renderLoop();
  });
}

Raster.prototype.show = function() {
  let q = _state.backendRenderer.queue();
  _state.timeClick = 0;
  _state.config.translateX = 0;
  _state.config.translateY = 0;
  if (_state.config.translateCenter) {
    _state.config.translateX = _state.config.screenWidth / 2;
    _state.config.translateY = _state.config.screenHeight / 2;
  }
  _state.isExec = true;
  var self = this;
  createBackendRenderer(function(r, map) {
    _state.backendRenderer = r;
    _state.backendRenderer.assignRgbMapping(map);
    self._allImagesOpen();
    _state.renderFunc = function() {
      for (let i = 0; i < q.length; i++) {
        let row = q[i];
        let fname = row[0];
        let args = row.slice(1);
        let func = r[fname];
        if (func) {
          func.apply(r, args);
        } else {
          throw 'Function ' + fname + ' not found';
        }
      }
    }
    self.renderShow();
  });
}

Raster.prototype._allImagesOpen = function() {
  for (var i = 0; i < _state.images.length; i++) {
    var img = _state.images[i];
    if (!img.isOpen) {
      _state.backendRenderer.loadImage(img.filename);
    }
  }
}

Raster.prototype.oscillate = function(period, fracOffset) {
  if (fracOffset === undefined) {
    fracOffset = 0.0;
  }
  let click = _state.timeClick + Math.round(period * fracOffset);
  return (1.0 - Math.cos(click * TAU / period)) / 2.0;
}

Raster.prototype.fillBackground = function(color) {
  _state.backendRenderer.fillBackground(color);
}

Raster.prototype.setColor = function(color) {
  _state.backendRenderer.setColor(color);
}

Raster.prototype.drawSquare = function(params) {
  let [x, y, size] = destructure(params, arguments, ['x', 'y', 'size']);
  if (_state.isExec) {
    x += _state.config.translateX;
    y += _state.config.translateY;
  }
  _state.backendRenderer.drawRect(x, y, size, size);
}

Raster.prototype.drawRect = function(params) {
  let [x, y, w, h] = destructure(params, arguments, ['x', 'y', 'w', 'h']);
  if (_state.isExec) {
    x += _state.config.translateX;
    y += _state.config.translateY;
  }
  _state.backendRenderer.drawRect(x, y, w, h);
}

Raster.prototype.drawPoint = function(params) {
  let [x, y] = destructure(params, arguments, ['x', 'y']);
  if (_state.isExec) {
    x += _state.config.translateX;
    y += _state.config.translateY;
  }
  _state.backendRenderer.drawPoint(x, y);
}

Raster.prototype.drawPolygon = function(params) {
  _state.backendRenderer.drawPolygon(_state.config.translateX,
                                     _state.config.translateY, params);
}

Raster.prototype.drawLine = function(params) {
  let [x, y, x1, y1] = destructure(params, arguments, ['x','y','x1','y1']);
  if (_state.isExec) {
    x  += _state.config.translateX;
    y  += _state.config.translateY;
    x1 += _state.config.translateX;
    y1 += _state.config.translateY;
  }
  _state.backendRenderer.drawLine(x, y, x1, y1);
}

Raster.prototype.drawImage = function(params) {
  let [img, x, y] = destructure(params, arguments, ['img', 'x', 'y']);
  if (_state.isExec) {
    x += _state.config.translateX;
    y += _state.config.translateY;
  }
  _state.backendRenderer.drawImage(img, x, y);
}

Raster.prototype.drawCircle = function(params) {
  let width = null;
  if (params.width) {
    width = params.width;
    delete params.width;
  }
  let [x, y, r] = destructure(params, arguments, ['x','y','r']);
  let centerX = x + r;
  let centerY = y + r;
  if (_state.isExec) {
    centerX += _state.config.translateX;
    centerY += _state.config.translateY;
  }
  let arc = midpointCircleRasterize(r);
  let inner = null;
  if (width) {
    inner = midpointCircleRasterize(r - width - 1);
  }
  _state.backendRenderer.drawCircleFromArc(centerX, centerY, arc, inner);
}

function midpointCircleRasterize(r) {
  let arc = new Array();
  let y = 0;
  let x = r;
  let rSquared = r * r;
  let xSquared = rSquared;
  let ySquared = 0 * 0;
  // Loop increments Y each step, and decrements X occasionally, based upon
  // error accumulation. Eventually X==Y, which breaks the loop.
  while (true) {
    // Invariant: x * x == xSquared && y * y == ySquared
    let answer = rSquared - ySquared;
    let err = xSquared - answer;
    if (err >= x) {
      xSquared = xSquared - 2 * x + 1;
      x -= 1;
    }
    if (x < y) {
      break;
    }
    arc.push([x, y])
    ySquared = ySquared + 2 * y + 1;
    y += 1;
  }
  return arc;
}

Raster.prototype.renderLoop = function() {
  let config = this._config;
  let self = this;
  _state.backendRenderer.initialize();
  _state.backendRenderer.createWindow(_state.config.screenWidth,
                                      _state.config.screenHeight);
  _state.backendRenderer.appRenderAndLoop(function() {
    self.renderOnce();
  }, -1);
}

Raster.prototype.renderShow = function() {
  let config = this._config;
  let self = this;
  _state.backendRenderer.initialize();
  _state.backendRenderer.createWindow(_state.config.screenWidth,
                                      _state.config.screenHeight);
  self.renderOnce();
  _state.backendRenderer.appRenderAndLoop(function() {
    self.renderOnce();
  }, 1);
}

Raster.prototype.renderOnce = function() {
  // Called once per render operation. Set the click, then call app's frame
  this.timeClick = _state.timeClick;
  _state.timeClick++;
  _state.renderFunc();
}

Raster.prototype.rotatePolygon = rotatePolygon;

////////////////////////////////////////
// Export

var _priv_raster = new Raster();

if (isRunningNodejs) {
  module.exports = _priv_raster;
} else {
  function require(moduleName) {
    if (moduleName === 'qgfx' || moduleName === './qgfx') {
      return _priv_raster;
    }
    throw 'Could not require module named "' + moduleName + '"';
  }
}
