const drawing = require('./drawing.js');

const D_CLEAN      = 0;
const D_FILL_SOLID = 1;
const D_FILL_DOTS  = 2;
const D_DIRTY      = 3;
const D_DID_FILL   = 4;
const D_DRAWN      = 5;
const MAX_DOTS_DRAWN = 36;

var _g_scene = null;

function Plane() {
  let rawBuff = _g_scene.env.makeRawBuffer();
  this.rawBuffer = rawBuff;
  this.colorSet = _g_scene.colorSet;
  this.rawBuffer.useColors(this.colorSet);
  this.clear();
  this.scene = _g_scene;
  this._addMethods();
  return this;
}

function setGlobalScene(scene) {
  _g_scene = scene;
}

Plane.prototype.clear = function() {
  this.width = 100;
  this.height = 100;
  this.translateX = 0;
  this.translateY = 0;
  this.mem = null;
  this._backBuffer = null;
  this.dirtyState = D_CLEAN;
  this.dotsDrawn = new Array();
  this.bgColor = 0;
  this.frontColor = 7;
  this.rawBuffer.clear();
}

Plane.prototype._addMethods = function() {
  let self = this;
  let d = new drawing.Drawing();
  let methods = d.getMethods();
  for (let i = 0; i < methods.length; i++) {
    let [fname, params, impl] = methods[i];
    this[fname] = function() {
      let args = Array.from(arguments);
      impl.apply(this, args);
    }
  }
}

Plane.prototype.trueBuffer = function() {
  return this.rawBuffer.rawData();
}

Plane.prototype.setSize = function(width, height) {
  // TODO: destructure
  this.width = width;
  this.height = height;
  this.rawBuffer.setSize(width, height);
}

Plane.prototype.useColors = function(rep) {
  this.colorSet.use(rep);
  this.rawBuffer.useColors(this.colorSet);
}

Plane.prototype.setColor = function(color) {
  this.frontColor = color;
  this.rawBuffer.setColor(color);
}

Plane.prototype.setTrueColor = function(rgb) {
  let color = this.colorSet.addEntry(rgb);
  this.setColor(color);
}

Plane.prototype.fillBackground = function(color) {
  this.dirtyState = D_FILL_SOLID;
  this.bgColor = color;
  this.rawBuffer.fillBackground(color);
}

Plane.prototype.fillTrueBackground = function(rgb) {
  this.dirtyState = D_FILL_SOLID;
  let color = this.colorSet.addEntry(rgb);
  this.fillBackground(color);
}

Plane.prototype.setTranslation = function(relPos) {
  this.translateX = Math.floor(this.width * relPos);
  this.translateY = Math.floor(this.height * relPos);
}

Plane.prototype._getTranslation = function() {
  return [this.translateX, this.translateY];
}

Plane.prototype.nextFrame = function() {
  let old = this.dirtyState;
  if (this.dirtyState == D_DID_FILL || this.dirtyState == D_CLEAN) {
    this.dirtyState = D_CLEAN;
  } else {
    this.dirtyState = D_DRAWN;
  }
  if (this.mem) {
    this.mem._didFrame = false;
  }
}

Plane.prototype.save = function(savepath) {
  let buffer = this.trueBuffer();
  // TODO: fix definition of pitch
  let pitch = this.width * 4;
  let saveService = this.scene.saveService;
  if (!saveService) {
    throw new Error('cannot save plane without save service');
  }
  saveService.saveTo(savepath, buffer, this.width, this.height, pitch);
}

module.exports.Plane = Plane;
module.exports.setGlobalScene = setGlobalScene;
