const rgbColor = require('./rgb_color.js');
const scene = require('./scene.js');
const drawing = require('./drawing.js');
const destructure = require('./destructure.js');
const plane = require('./plane.js');
const tiles = require('./tiles.js');

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

Raster.prototype._removeMethods = function() {
  let self = this;
  let d = new drawing.Drawing();
  let methods = d.getMethods();
  for (let i = 0; i < methods.length; i++) {
    let [fname, params, converter, impl] = methods[i];
    delete this[fname];
  }
}
Raster.prototype.resetState = function() {
  this.scene.resetState();
  this.time = 0.0;
  this.timeClick = 0;
  this._addMethods();
}

Raster.prototype.TAU = 6.283185307179586;
Raster.prototype.time = 0.0;
Raster.prototype.timeClick = 0;

////////////////////////////////////////
// Setup the draw target

Raster.prototype.setZoom = function(zoomLevel) {
  this.scene.setZoom(zoomLevel);
}

Raster.prototype.setGrid = function(unit) {
  this.scene.setGrid(unit);
}

Raster.prototype.setTitle = function(text) {
  this.scene.setTitle(text);
}

Raster.prototype.originAtCenter = function() {
  this.scene.originAtCenter();
}

Raster.prototype.useDisplay = function(disp) {
  this.scene.useDisplay(disp);
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

////////////////////////////////////////

Raster.prototype.Plane = function() {
  if (new.target === undefined) {
    throw new Error('Plane constructor must be called with `new`');
  }
  let p = new plane.Plane();
  p._addMethods(true);
  return p;
}

Raster.prototype.Tileset = function() {
  if (new.target === undefined) {
    throw new Error('Tileset constructor must be called with `new`');
  }
  let args = arguments;
  // TODO: destructure?
  return new tiles.Tileset(args[0], args[1]);
}

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

Raster.prototype.oscil = function(namedOnly) {
  let spec = ['!name', 'period?i=60', 'begin?n', 'amp?n=1.0', 'click?a'];
  let [period, begin, amp, click] = destructure.from(
    'oscil', spec, arguments, null);

  period = period || 60;
  if (begin === undefined) {
    begin = 0.0;
  }
  if (click === null) {
    click = this.timeClick;
  }
  click = click + Math.round(period * begin);
  return amp * ((1.0 - Math.cos(click * this.TAU / period)) / 2.0000001);
}

Raster.prototype.eyedrop = function(x, y) {
  return this.scene.eyedrop(x, y);
}

Raster.prototype.usePalette = function(optOrVals) {
  return this.scene.usePalette(optOrVals);
}

Raster.prototype.setFont = function(spec) {
  this.scene.setFont(spec);
}

Raster.prototype.setTileset = function(which) {
  this.scene.setTileset(which);
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
  let spec = ['x:i', 'y:i', 'w:i', 'h:i'];
  [x, y, w, h] = destructure.from('select', spec, arguments, null);
  return this.scene.select(x, y, w, h);
}

Raster.prototype.setSize = function(width, height) {
  let spec = ['w:i', 'h?i'];
  [width, height] = destructure.from('setSize', spec, arguments, null);
  if (height === undefined) { height = width; }
  this.scene.setSize(width, height);
}

Raster.prototype.setScrollX = function(v) {
  this.scene.setScrollX(v);
}

Raster.prototype.setScrollY = function(v) {
  this.scene.setScrollY(v);
}

////////////////////////////////////////

Raster.prototype.useTileset = function(pl, sizeInfo) {
  return this.scene.useTileset(pl, sizeInfo);
}

Raster.prototype.useAttributes = function(pl, sizeInfo) {
  return this.scene.useAttributes(pl, sizeInfo);
}

Raster.prototype.usePlane = function(pl) {
  this._removeMethods();
  return this.scene.usePlane(pl);
}

Raster.prototype.useInterrupts = function(conf) {
  return this.scene.useInterrupts(conf);
}

////////////////////////////////////////
// Display endpoints

Raster.prototype.run = function(drawFunc) {
  var self = this;
  var runner = this.scene;
  runner.then(function() {
    runner.run(
      drawFunc,
      self.nextFrame.bind(self),
    );
  });
}

Raster.prototype.show = function(drawFunc, finalFunc) {
  var runner = this.scene;
  runner.then(function() {
    if (drawFunc) {
      drawFunc();
    }
    runner.show(finalFunc);
  });
}

Raster.prototype.save = function(savepath) {
  var runner = this.scene;
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

Raster.prototype.then = function(callback) {
  var runner = this.scene;
  runner.then(function() {
    callback();
  });
}

Raster.prototype.on = function(eventName, callback) {
  this.scene.handleEvent(eventName, callback);
}

////////////////////////////////////////
// Export

var env = null;
if (typeof window === 'undefined' && typeof process !== 'undefined') {
  // Node.js
  env = require('./node_env.js');
} else {
  // Webpack or browserify
  env = require('./web_env.js');
}

var singleton = new Raster(env);

if (typeof module !== 'undefined') {
  // Node.js or browserify
  module.exports = singleton;
}

if (typeof window !== 'undefined') {
  // Webpack
  window['require'] = function(moduleName) {
    if (moduleName === 'raster') {
      return singleton;
    }
    throw 'Could not require module named "' + moduleName + '"';
  };
}
