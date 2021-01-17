
// Detect whether running in browser or node.js
var isRunningNodejs;
if (typeof window === 'undefined') {
  isRunningNodejs = true;
} else {
  isRunningNodejs = false;
}

////////////////////////////////////////
// Private global data used by Raster object

function Raster() {
  this.cmd = null;
  this.methods = null;
  this.then = null;
  return this;
}

var _priv_raster = new Raster();

////////////////////////////////////////
// Pick which backend renderer to use

if (isRunningNodejs) {
  // Running in node.js
  const runner = require('./node_runner.js');
  runner.start(function(r) {
    var self = _priv_raster;
    self.cmd = r.cmd;
    self.methods = r.methods;
    self.then = r.then;
  });
} else {
  // Running in browser
  // TODO: Global namespace pollution.
  var loadScript;
  (function() {
    var self = _priv_raster;
    self.cmd = new Array();
    self.methods = {
      makeImage: function() { return ['QImage', self.cmd.length]; },
      resetState: function() {},
    };
    self.then = function(callback) {
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
          runner.start(self, callback);
        });
      }, 10);
    }
  })();
}

////////////////////////////////////////
// primary object

Raster.prototype.resetState = function() {
  this.methods.resetState();
}

Raster.prototype.TAU = 6.283185307179586;

Raster.prototype.timeClick = 0;

////////////////////////////////////////
// Setup the draw target

Raster.prototype.setSize = function() {
  this.cmd.push(['setSize', arguments]);
}

Raster.prototype.setZoom = function() {
  this.cmd.push(['setZoom', arguments]);
}

Raster.prototype.setTitle = function() {
  this.cmd.push(['setTitle', arguments]);
}

Raster.prototype.originAtCenter = function() {
  this.cmd.push(['originAtCenter', []]);
}

Raster.prototype.useSystemColors = function() {
  this.cmd.push(['useSystemColors', arguments]);
}

////////////////////////////////////////
// Methods with interesting return values

Raster.prototype.loadImage = function(filepath) {
  return this.methods.makeShape('load', [filepath]);
}

Raster.prototype.rotatePolygon = function(shape, angle) {
  return this.methods.makeShape('rotate', [shape, angle]);
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

Raster.prototype.getPaletteEntry = function(x, y) {
  return this.methods.getPaletteEntry(x, y);
}

Raster.prototype.getPaletteAll = function() {
  return this.methods.getPaletteAll();
}

////////////////////////////////////////
// Rendering functionality

Raster.prototype.fillBackground = function() {
  this.cmd.push(['fillBackground', arguments]);
}

Raster.prototype.fillRealBackground = function() {
  this.cmd.push(['fillRealBackground', arguments]);
}

Raster.prototype.setColor = function() {
  this.cmd.push(['setColor', arguments]);
}

Raster.prototype.setRealColor = function() {
  this.cmd.push(['setRealColor', arguments]);
}

Raster.prototype.fillSquare = function() {
  this.cmd.push(['fillSquare', arguments]);
}

Raster.prototype.drawSquare = function() {
  this.cmd.push(['drawSquare', arguments]);
}

Raster.prototype.fillRect = function() {
  this.cmd.push(['fillRect', arguments]);
}

Raster.prototype.drawRect = function() {
  this.cmd.push(['drawRect', arguments]);
}

Raster.prototype.drawPoint = function() {
  this.cmd.push(['drawPoint', arguments]);
}

Raster.prototype.fillPolygon = function() {
  this.cmd.push(['fillPolygon', arguments]);
}

Raster.prototype.drawPolygon = function() {
  this.cmd.push(['drawPolygon', arguments]);
}

Raster.prototype.drawLine = function() {
  this.cmd.push(['drawLine', arguments]);
}

Raster.prototype.drawImage = function() {
  this.cmd.push(['drawImage', arguments]);
}

Raster.prototype.fillCircle = function() {
  this.cmd.push(['fillCircle', arguments]);
}

Raster.prototype.drawCircle = function() {
  this.cmd.push(['drawCircle', arguments]);
}

Raster.prototype.fillFrame = function(callback) {
  var self = this;
  self.then(function() {
    self.methods.fillFrame(callback);
  });
}

////////////////////////////////////////
// Display endpoints

Raster.prototype.run = function(renderFunc) {
  var self = this;
  self.then(function() {
    self.methods.run(renderFunc, function() {
      self.timeClick++;
    });
  });
}

Raster.prototype.show = function() {
  var self = this;
  self.then(function() {
    self.methods.show();
  });
}

Raster.prototype.save = function(savepath) {
  var self = this;
  self.then(function() {
    self.methods.save(savepath);
  });
}

Raster.prototype.showFrame = function(callback) {
  var self = this;
  self.then(function() {
    // TODO: Figure out if web_runner can call this syncronously.
    // If so, replace with fillFrame -> show
    self.methods.showFrame(callback);
  });
}

Raster.prototype.quit = function() {
  var self = this;
  self.then(function() {
    self.methods.quit();
  });
}

Raster.prototype.on = function(eventName, callback) {
  this.methods.handleEvent(eventName, callback);
}

////////////////////////////////////////
// Export

_priv_raster.resetState();

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
