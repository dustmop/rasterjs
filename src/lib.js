
// Detect whether running in browser or node.js
var isRunningNodejs;
if (typeof window === 'undefined') {
  isRunningNodejs = true;
} else {
  isRunningNodejs = false;
}

////////////////////////////////////////
// Private global data used by Raster object

var _priv = {
  cmd: null,
  methods: null,
  then: null,
};

////////////////////////////////////////
// Pick which backend renderer to use

if (isRunningNodejs) {
  // Running in node.js
  const runner = require('./node_runner.js');
  runner.start(function(r) {
    _priv.cmd = r.cmd;
    _priv.methods = r.methods;
    _priv.then = r.then;
  });
} else {
  // Running in browser
  // TODO: Global namespace pollution.
  var loadScript;
  _priv.cmd = new Array();
  _priv.methods = {
    makeImage: function() { return ['QImage', _priv.cmd.length]; },
    resetState: function() {},
  };
  _priv.then = function(callback) {
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
      loadScript('/web_runner.js', function() {
        // TODO: Global namespace pollution.
        var runner = _webRunnerMake();
        runner.start(_priv, callback);
      });
    }, 10);
  };
}

////////////////////////////////////////
// primary object

function Raster() {
  return this;
}

Raster.prototype.resetState = function() {
  _priv.methods.resetState();
}

Raster.prototype.TAU = 6.283185307179586;

Raster.prototype.timeClick = 0;

////////////////////////////////////////
// Setup the draw target

Raster.prototype.setSize = function() {
  _priv.cmd.push(['setSize', arguments]);
}

Raster.prototype.setZoom = function() {
  _priv.cmd.push(['setZoom', arguments]);
}

Raster.prototype.setTitle = function() {
  _priv.cmd.push(['setTitle', arguments]);
}

Raster.prototype.originAtCenter = function() {
  _priv.cmd.push(['originAtCenter', []]);
}

////////////////////////////////////////
// Methods with interesting return values

Raster.prototype.loadImage = function(filepath) {
  return _priv.methods.makeShape('load', [filepath]);
}

Raster.prototype.rotatePolygon = function(shape, angle) {
  return _priv.methods.makeShape('rotate', [shape, angle]);
}

Raster.prototype.oscil = function(period, fracOffset, click) {
  if (fracOffset === undefined) {
    fracOffset = 0.0;
  }
  if (click === undefined) {
    click = this.timeClick;
  }
  click = click + Math.round(period * fracOffset);
  return (1.0 - Math.cos(click * this.TAU / period)) / 2.0;
}

////////////////////////////////////////
// Rendering functionality

Raster.prototype.fillBackground = function() {
  _priv.cmd.push(['fillBackground', arguments]);
}

Raster.prototype.setColor = function() {
  _priv.cmd.push(['setColor', arguments]);
}

Raster.prototype.fillSquare = function() {
  _priv.cmd.push(['fillSquare', arguments]);
}

Raster.prototype.drawSquare = function() {
  _priv.cmd.push(['drawSquare', arguments]);
}

Raster.prototype.fillRect = function() {
  _priv.cmd.push(['fillRect', arguments]);
}

Raster.prototype.drawRect = function() {
  _priv.cmd.push(['drawRect', arguments]);
}

Raster.prototype.drawPoint = function() {
  _priv.cmd.push(['drawPoint', arguments]);
}

Raster.prototype.fillPolygon = function() {
  _priv.cmd.push(['fillPolygon', arguments]);
}

Raster.prototype.drawPolygon = function() {
  _priv.cmd.push(['drawPolygon', arguments]);
}

Raster.prototype.drawLine = function() {
  _priv.cmd.push(['drawLine', arguments]);
}

Raster.prototype.drawImage = function() {
  _priv.cmd.push(['drawImage', arguments]);
}

Raster.prototype.fillCircle = function() {
  _priv.cmd.push(['fillCircle', arguments]);
}

Raster.prototype.drawCircle = function() {
  _priv.cmd.push(['drawCircle', arguments]);
}

Raster.prototype.fillFrame = function(callback) {
  _priv.then(function() {
    _priv.methods.fillFrame(callback);
  });
}

////////////////////////////////////////
// Display endpoints

Raster.prototype.run = function(renderFunc) {
  var self = this;
  _priv.then(function() {
    _priv.methods.run(renderFunc, function() {
      self.timeClick++;
    });
  });
}

Raster.prototype.show = function() {
  _priv.then(function() {
    _priv.methods.show();
  });
}

Raster.prototype.save = function(savepath) {
  _priv.then(function() {
    _priv.methods.save(savepath);
  });
}

Raster.prototype.showFrame = function(callback) {
  _priv.then(function() {
    // TODO: Figure out if web_runner can call this syncronously.
    // If so, replace with fillFrame -> show
    _priv.methods.showFrame(callback);
  });
}

////////////////////////////////////////
// Export

var _priv_raster = new Raster();
_priv_raster.resetState();

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
