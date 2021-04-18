
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

Raster.prototype.useSystemColors = function() {
  this.runner.dispatch(['useSystemColors', arguments]);
}

////////////////////////////////////////
// Methods with interesting return values

Raster.prototype.loadImage = function(filepath) {
  return this.runner.makeShape('load', [filepath]);
}

Raster.prototype.rotatePolygon = function(shape, angle) {
  return this.runner.makeShape('rotate', [shape, angle]);
}

Raster.prototype.oscil = function(period, fracOffset, click) {
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

Raster.prototype.getPaletteAll = function() {
  return this.runner.getPaletteAll();
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

Raster.prototype.fillFrame = function(callback) {
  var runner = this.runner;
  runner.then(function() {
    runner.fillFrame(callback);
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

Raster.prototype.show = function() {
  var runner = this.runner;
  runner.then(function() {
    runner.show();
  });
}

Raster.prototype.save = function(savepath) {
  var runner = this.runner
  runner.then(function() {
    runner.save(savepath);
  });
}

Raster.prototype.showFrame = function(callback) {
  var runner = this.runner;
  runner.then(function() {
    runner.fillFrame(callback);
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
singleton.resetState();
if (typeof window === 'undefined') {
  // Node.js
  module.exports = singleton;
} else {
  // Web browser
  window['require'] = function(moduleName) {
    if (moduleName === 'raster.js' || moduleName === './raster.js') {
      return singleton;
    }
    throw 'Could not require module named "' + moduleName + '"';
  };
}
