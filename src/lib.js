
////////////////////////////////////////
// Private global data used by Raster object

function Raster() {
  this.runner = null;
  return this;
}

var singleton = new Raster();

////////////////////////////////////////
// Pick which backend renderer to use

if (typeof window === 'undefined') {
  if (!process.env.WEBPACK_COMPILE_FOR_BROWSER) {
    const runner = require('./node_runner.js');
    singleton.runner = new runner.Runner();
  }
} else {
  const runner = require('./web_runner.js');
  singleton.runner = runner;
}

////////////////////////////////////////
// primary object

Raster.prototype.resetState = function() {
  this.runner.resetState();
}

Raster.prototype.TAU = 6.283185307179586;

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
  var runner = this.runner;
  runner.then(function() {
    runner.run(renderFunc, function() {
      runner.timeClick++;
    });
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
    // TODO: Figure out if web_runner can call this syncronously.
    // If so, replace with fillFrame -> show
    runner.showFrame(callback);
  });
}

Raster.prototype.quit = function() {
  var runner = this.runner;
  runner.then(function() {
    runner.quit();
  });
}

Raster.prototype.on = function(eventName, callback) {
  this.handleEvent(eventName, callback);
}

////////////////////////////////////////
// Export

singleton.resetState();
if (typeof window === 'undefined') {
  module.exports = singleton;
} else {
  function require(moduleName) {
    if (moduleName === 'raster.js' || moduleName === './raster.js') {
      return singleton;
    }
    throw 'Could not require module named "' + moduleName + '"';
  }
}
