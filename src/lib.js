
var canvas;
var ctx;
var opt = {drawColor: null};

function fillBackground(color) {
  ctx.fillStyle = 'grey';
  ctx.fillRect(0, 0, 256, 256);
}

function setColor(color) {
  opt.drawColor = color;
}

function round(f) {
  return Math.round(f);
}

function drawPolygon(x, y, params) {
  ctx.fillStyle = 'white';
  ctx.beginPath();
  var p = params[0];
  ctx.moveTo(round(x + p[0]), round(y + p[1]));
  for (var i = 1; i < params.length; i++) {
    var p = params[i];
    ctx.lineTo(round(x + p[0]), round(y + p[1]));
  }
  ctx.fill();
}

function drawLine(x, y, x1, y1) {
  ctx.fillStyle = 'red';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x1, y1);
  ctx.stroke();
}

function drawRect(x, y, w, h) {
  ctx.fillStyle = 'red';
  ctx.fillRect(x, y, w, h);
}

var createBackendRenderer;
var isRunningNodejs;
if (typeof window === 'undefined') {
  // Running in node.js
  isRunningNodejs = true;
  if (process.argv.length > 2 && process.argv[2] == '--gif') {
    createBackendRenderer = function() {
      const {createCanvas} = require('canvas');
      const fs = require('fs');
      const os = require('os');
      const path = require('path');
      const util = require('util');
      const randstr = require('randomstring');
      var gifWidth;
      var gifHeight;
      var gifTmpdir;
      var r = {
        sdlInit: function() {},
        createWindow: function(width, height) {
          gifWidth = parseInt(width, 10);
          gifHeight = parseInt(height, 10);
          gifTmpdir = path.join(os.tmpdir(), 'raster-' + randstr.generate(8));
          try {
            fs.mkdirSync(gifTmpdir);
          } catch (e) {
          }
          console.log('tmp = "' + gifTmpdir + '"');
        },
        renderLoop: function(f) {
          var numFrames = 64;
          for (var count = 0; count < numFrames; count++) {
            canvas = createCanvas(gifWidth, gifHeight);
            ctx = canvas.getContext('2d');
            ctx.antialias = 'none';
            f();
            ctx = null;
            var n = count.toString();
            while (n.length < 3) {
              n = '0' + n;
            }
            const buffer = canvas.toBuffer();
            var filename = util.format('%s/%s.png', gifTmpdir, n);
            fs.writeFileSync(filename, buffer)
          }
          const gifOpt = {repeat: 0, delay: 16, quality: 10};
          const GIFEncoder = require('gifencoder');
          const encoder = new GIFEncoder(gifWidth, gifHeight);
          const pngFileStream = require('png-file-stream');
          const stream = pngFileStream(gifTmpdir + '/*.png')
                .pipe(encoder.createWriteStream(gifOpt))
                .pipe(fs.createWriteStream('myanimated.gif'));
          stream.on('finish', function () {
            console.log('created!');
          });
        },
        fillBackground: fillBackground,
        setColor: setColor,
        drawPolygon: drawPolygon,
        drawLine: drawLine,
        drawRect: drawRect,
      };
      return r;
    }
  } else {
    createBackendRenderer = require('../build/Release/native');
  }
} else {
  // Running in browser
  isRunningNodejs = false;
  createBackendRenderer = function() {
    var drawColor;
    var r = {
      sdlInit:      function() {},
      createWindow: function(width, height) {
        canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        document.body.appendChild(canvas);
        var c = document.getElementsByTagName('canvas')[0];
        c.style.width = width * 3;
        c.style.height = height * 3;
      },
      renderLoop: function(f) {
        requestAnimationFrame(function() {
          ctx = canvas.getContext('2d');
          f();
          r.renderLoop(f);
        });
      },
      fillBackground: fillBackground,
      setColor: setColor,
      drawPolygon: drawPolygon,
      drawLine: drawLine,
      drawRect: drawRect,
    };
    return r;
  };
}

function Raster() {
  this._config = {};
  this._isRunning = false;
  this._frameFunc = null;
  this._renderSystem = null;
  this._backendRenderer = null;
  this._timeClick = null;
  return this;
}

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

Raster.prototype.setViewportSize = function(params) {
  if (this._isRunning) {
    throw 'Cannot setViewportSize when app is running';
  }
  let [w, h] = destructure(params, arguments, ['w', 'h']);
  this._config.screenWidth = w;
  this._config.screenHeight = h;
}

Raster.prototype.setPixelScale = function(s) {
  if (this._isRunning) {
    throw 'Cannot setPixelScale when app is running';
  }
  this._config.scale = s;
}

Raster.prototype.originAtCenter = function() {
  if (this._isRunning) {
    throw 'Cannot originAtCenter when app is running';
  }
  this._config.translateCenter = true;
}

Raster.prototype.run = function(renderFunc) {
  this._renderFunc = renderFunc;
  this._timeClick = 0;
  this._config.translateX = 0;
  this._config.translateY = 0;
  if (this._config.translateCenter) {
    this._config.translateX = this._config.screenWidth / 2;
    this._config.translateY = this._config.screenHeight / 2;
  }
  this.renderLoop();
}

let TAU = 6.283185307179586;

Raster.prototype.addRenderCalls = function() {
  let self = this;

  self.TAU = TAU;

  self.oscillate = function(period, click) {
    if (click === undefined) {
      click = self.timeClick;
    }
    return (1.0 - Math.cos(click * TAU / period)) / 2.0;
  };

  self.fillBackground = function(color) {
    self._backendRenderer.fillBackground(color);
  };

  self.setColor = function(color) {
    self._backendRenderer.setColor(color);
  };

  self.drawSquare = function(params) {
    let [x, y, size] = destructure(params, arguments, ['x', 'y', 'size']);
    x += self._config.translateX;
    y += self._config.translateY;
    self._backendRenderer.drawRect(x, y, size, size);
  };

  self.drawRect = function(params) {
    let [x, y, w, h] = destructure(params, arguments, ['x', 'y', 'w', 'h']);
    x += self._config.translateX;
    y += self._config.translateY;
    self._backendRenderer.drawRect(x, y, w, h);
  };

  self.drawPolygon = function(params) {
    self._backendRenderer.drawPolygon(self._config.translateX,
                                 self._config.translateY, params);
  };

  self.drawLine = function(params) {
    let [x, y, x1, y1] = destructure(params, arguments, ['x','y','x1','y1']);
    x  += self._config.translateX;
    y  += self._config.translateY;
    x1 += self._config.translateX;
    y1 += self._config.translateY;
    self._backendRenderer.drawLine(x, y, x1, y1);
  };

  self.rotatePolygon = rotatePolygon;
}

Raster.prototype.renderLoop = function() {
  let config = this._config;
  let self = this;
  this.addRenderCalls();
  this._backendRenderer = createBackendRenderer();
  this._backendRenderer.sdlInit();
  setTimeout(function() {
    self._backendRenderer.createWindow(config.screenWidth, config.screenHeight);
    self._backendRenderer.renderLoop(function() {
      self.renderOnce();
    });
  }, 0);
}

Raster.prototype.renderOnce = function() {
  // Called once per render operation. Set the click, then call app's frame
  this.timeClick = this._timeClick;
  this._timeClick++;
  this._renderFunc();
}

var _priv_raster = new Raster();

if (isRunningNodejs) {
  module.exports = _priv_raster;
} else {
  function require(moduleName) {
    if (moduleName === 'raster.js' || moduleName === './raster.js') {
      return _priv_raster;
    }
    throw 'Could not require module named "' + moduleName + '"';
  }
}
