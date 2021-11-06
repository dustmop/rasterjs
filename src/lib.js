const rgbColor = require('./rgb_color.js');
const scene = require('./scene.js');
const drawing = require('./drawing.js');
const plane = require('./plane.js');

function Raster(env) {
  this.scene = new scene.Scene(env);
  this._addMethods();
  return this;
}

Raster.prototype._addMethods = function() {
  let self = this;
  let d = new drawing.Drawing();
  let methods = d.getMethods();
  for (let i = 0; i < methods.length; i++) {
    let [fname, params, converter, impl] = methods[i];
    this[fname] = function() {
      let args = Array.from(arguments);
      self.scene[fname].apply(self.scene, args);
    }
  }
}

Raster.prototype.resetState = function() {
  this.scene.resetState();
  this.time = 0.0;
  this.timeClick = 0;
}

Raster.prototype.TAU = 6.283185307179586;
Raster.prototype.time = 0.0;
Raster.prototype.timeClick = 0;

////////////////////////////////////////
// Setup the draw target

Raster.prototype.setZoom = function(zoomLevel) {
  this.scene.setZoom(zoomLevel);
}

Raster.prototype.setTitle = function(text) {
  this.scene.setTitle(text);
}

Raster.prototype.originAtCenter = function() {
  this.scene.originAtCenter();
}

Raster.prototype.useColors = function(rep) {
  return this.scene.useColors(rep);
}

Raster.prototype.appendColors = function(rep) {
  return this.scene.appendColors(rep);
}

Raster.prototype.numColors = function() {
  return this.scene.numColors();
}

Raster.prototype.useDisplay = function(disp) {
  this.scene.useDisplay(disp);
}

Raster.prototype.Plane = plane.Plane;

////////////////////////////////////////
// Methods with interesting return values

Raster.prototype.loadImage = function(filepath, opt) {
  return this.scene.makeShape('load', [filepath, opt]);
}

Raster.prototype.makePolygon = function(shape, angle) {
  return this.scene.makeShape('polygon', [shape]);
}

Raster.prototype.rotatePolygon = function(shape, angle) {
  return this.scene.makeShape('rotate', [shape, angle]);
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
  return this.scene.getPaletteEntry(x, y);
}

Raster.prototype.getPaletteAll = function(opt) {
  opt = opt || {};
  return this.scene.getPaletteAll(opt);
}

Raster.prototype.usePalette = function(vals) {
  return this.scene.usePalette(vals);
}

Raster.prototype.setFont = function(filename) {
  this.scene.setFont(filename);
}

Raster.prototype.mixColors = function(spec) {
  let result = [];
  let cursor = 0;
  let leftColor = spec[cursor + 1];
  let rightColor = spec[cursor + 3];
  let startIndex = spec[0];
  let targetIndex = spec[2];
  let endIndex = spec[spec.length - 2];
  for (let i = 0; i < endIndex; i++) {
    if (i == targetIndex) {
      cursor += 2;
      startIndex = targetIndex;
      leftColor = spec[cursor + 1];
      rightColor = spec[cursor + 3];
      targetIndex = spec[cursor + 2];
    }
    let L = new rgbColor.RGBColor(leftColor);
    let R = new rgbColor.RGBColor(rightColor);
    let rgb = L.interpolate(R, i, {min: startIndex, max: targetIndex});
    result.push(rgb.toInt());
  }
  return result;
}

Raster.prototype.clonePlane = function() {
  let s = this.scene.aPlane;
  let p = s.clone();
  p.pitch = p.width;
  let numPixels = p.height * p.pitch;
  let newBuff = new Uint8Array(numPixels);
  for (let y = 0; y < p.height; y++) {
    for (let x = 0; x < p.width; x++) {
      let k = y*s.pitch + x;
      let j = y*p.pitch + x;
      newBuff[j] = s.data[k];
    }
  }
  p.data = newBuff;
  return p;
}

Raster.prototype.select = function(opt) {
  // TODO: destructure
  return this.scene.select(opt.x, opt.y, opt.w, opt.h);
}

////////////////////////////////////////

Raster.prototype.useTileset = function(img, sizeInfo) {
  // TODO: remove the draw_methods from ra
  this.scene.useTileset(img, sizeInfo);
}

Raster.prototype.usePlane = function(pl) {
  // TODO: remove the draw_methods from ra
  this.scene.aPlane = pl;
}

////////////////////////////////////////
// Display endpoints

Raster.prototype.run = function(renderFunc) {
  var self = this;
  var runner = this.scene;
  runner.then(function() {
    runner.run(
      renderFunc,
      self.nextFrame.bind(self),
    );
  });
}

Raster.prototype.show = function(renderFunc, finalFunc) {
  var runner = this.scene;
  runner.then(function() {
    if (renderFunc) {
      renderFunc();
    }
    runner.show(finalFunc);
  });
}

Raster.prototype.save = function(savepath) {
  var runner = this.scene
  runner.then(function() {
    runner.save(savepath);
  });
}

Raster.prototype.showFrame = function() {
  var runner = this.scene;
  var args = arguments;
  runner.then(function() {
    runner.fillFrame.apply(runner, args);
    runner.show();
  });
}

Raster.prototype.quit = function() {
  var runner = this.scene;
  runner.then(function() {
    runner.quit();
  });
}

Raster.prototype.nextFrame = function() {
  var runner = this.scene;
  var self = this;
  runner.then(function() {
    self.timeClick++;
    self.time = self.timeClick / 60.0;
    runner.nextFrame();
  });
}

Raster.prototype.on = function(eventName, callback) {
  this.scene.handleEvent(eventName, callback);
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
