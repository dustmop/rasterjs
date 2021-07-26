
const runner = require('./runner.js');

function Raster(env) {
  this.runner = new runner.Runner(env);
  return this;
}

Raster.prototype.resetState = function() {
  this.runner.resetState();
  this.time = 0.0;
  this.timeClick = 0;
}

Raster.prototype.TAU = 6.283185307179586;
Raster.prototype.time = 0.0;
Raster.prototype.timeClick = 0;

////////////////////////////////////////
// Setup the draw target

Raster.prototype.setSize = function() {
  this.runner.dispatch(['setSize', arguments]);
}

Raster.prototype.setZoom = function() {
  this.runner.dispatch(['setZoom', arguments]);
}

Raster.prototype.setTitle = function() {
  this.runner.dispatch(['setTitle', arguments]);
}

Raster.prototype.originAtCenter = function() {
  this.runner.dispatch(['originAtCenter', []]);
}

Raster.prototype.useColors = function() {
  this.runner.dispatch(['useColors', arguments]);
}

Raster.prototype.useDisplay = function() {
  this.runner.dispatch(['useDisplay', arguments]);
}

////////////////////////////////////////
// Methods with interesting return values

Raster.prototype.loadImage = function(filepath) {
  return this.runner.makeShape('load', [filepath]);
}

Raster.prototype.makePolygon = function(shape, angle) {
  return this.runner.makeShape('polygon', [shape]);
}

Raster.prototype.rotatePolygon = function(shape, angle) {
  return this.runner.makeShape('rotate', [shape, angle]);
}

Raster.prototype.oscil = function(period, fracOffset, click) {
  period = period || 60;
  if (fracOffset === undefined) {
    fracOffset = 0.0;
  }
  if (click === undefined) {
    click = this.timeClick;
  }
  click = click + Math.round(period * fracOffset);
  return (1.0 - Math.cos(click * this.TAU / period)) / 2.0000001;
}

Raster.prototype.getPaletteEntry = function(x, y) {
  return this.runner.getPaletteEntry(x, y);
}

Raster.prototype.getPaletteAll = function(opt) {
  opt = opt || {};
  return this.runner.getPaletteAll(opt);
}

////////////////////////////////////////
// Rendering functionality

Raster.prototype.fillBackground = function() {
  this.runner.dispatch(['fillBackground', arguments]);
}

Raster.prototype.fillTrueBackground = function() {
  this.runner.dispatch(['fillTrueBackground', arguments]);
}

Raster.prototype.setColor = function() {
  this.runner.dispatch(['setColor', arguments]);
}

Raster.prototype.setTrueColor = function() {
  this.runner.dispatch(['setTrueColor', arguments]);
}

Raster.prototype.fillSquare = function() {
  this.runner.dispatch(['fillSquare', arguments]);
}

Raster.prototype.drawSquare = function() {
  this.runner.dispatch(['drawSquare', arguments]);
}

Raster.prototype.fillRect = function() {
  this.runner.dispatch(['fillRect', arguments]);
}

Raster.prototype.drawRect = function() {
  this.runner.dispatch(['drawRect', arguments]);
}

Raster.prototype.fillDot = function() {
  this.runner.dispatch(['fillDot', arguments]);
}

Raster.prototype.drawDot = function() {
  this.runner.dispatch(['drawDot', arguments]);
}

Raster.prototype.fillPolygon = function() {
  this.runner.dispatch(['fillPolygon', arguments]);
}

Raster.prototype.drawPolygon = function() {
  this.runner.dispatch(['drawPolygon', arguments]);
}

Raster.prototype.drawLine = function() {
  this.runner.dispatch(['drawLine', arguments]);
}

Raster.prototype.drawImage = function() {
  this.runner.dispatch(['drawImage', arguments]);
}

Raster.prototype.fillCircle = function() {
  this.runner.dispatch(['fillCircle', arguments]);
}

Raster.prototype.drawCircle = function() {
  this.runner.dispatch(['drawCircle', arguments]);
}

Raster.prototype.fillFlood = function() {
  this.runner.dispatch(['fillFlood', arguments]);
}

Raster.prototype.fillFrame = function() {
  var runner = this.runner;
  var args = arguments;
  runner.then(function() {
    runner.dispatch(['fillFrame', args]);
  });
}

////////////////////////////////////////
// Display endpoints

Raster.prototype.run = function(renderFunc) {
  var self = this;
  var runner = this.runner;
  runner.then(function() {
    runner.run(
      renderFunc,
      self.nextFrame.bind(self),
    );
  });
}

Raster.prototype.show = function(renderFunc, finalFunc) {
  var runner = this.runner;
  runner.then(function() {
    if (renderFunc) {
      renderFunc();
    }
    runner.show(finalFunc);
  });
}

Raster.prototype.save = function(savepath) {
  var runner = this.runner
  runner.then(function() {
    runner.save(savepath);
  });
}

Raster.prototype.showFrame = function() {
  var runner = this.runner;
  var args = arguments;
  runner.then(function() {
    runner.dispatch(['fillFrame', args]);
    runner.show();
  });
}

Raster.prototype.quit = function() {
  var runner = this.runner;
  runner.then(function() {
    runner.quit();
  });
}

Raster.prototype.nextFrame = function() {
  var runner = this.runner;
  var self = this;
  runner.then(function() {
    self.timeClick++;
    self.time = self.timeClick / 60.0;
    runner.nextFrame();
  });
}

Raster.prototype.on = function(eventName, callback) {
  this.runner.handleEvent(eventName, callback);
}

////////////////////////////////////////
// Export

var env = null;
if (typeof window === 'undefined') {
  // Node.js
  if (!process.env.WEBPACK_COMPILE_FOR_BROWSER) {
    env = require('./node_env.js');
  }
} else if (process.env.WEBPACK_COMPILE_FOR_BROWSER) {
  // Web browser
  env = require('./web_env.js');
}

var singleton = new Raster(env);
if (typeof window === 'undefined') {
  // Node.js
  module.exports = singleton;
} else {
  // Web browser
  window['require'] = function(moduleName) {
    if (moduleName === 'raster') {
      return singleton;
    }
    throw 'Could not require module named "' + moduleName + '"';
  };
}
