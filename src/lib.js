
const runner = require('./runner.js');
const drawing = require('./drawing.js');

function Raster(env) {
  this.runner = new runner.Runner(env);
  this._addMethods();
  return this;
}

Raster.prototype._addMethods = function() {
  let self = this;
  let d = new drawing.Drawing();
  let methods = d.getMethods();
  for (let i = 0; i < methods.length; i++) {
    let [fname, params, impl] = methods[i];
    this[fname] = function() {
      let args = Array.from(arguments);
      self.runner[fname].apply(self.runner, args);
    }
  }
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
  // TODO: Stop using dispatch
  // TODO: Move this and other functions into drawing?
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

Raster.prototype.setFont = function(filename) {
  this.runner.setFont(filename);
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
