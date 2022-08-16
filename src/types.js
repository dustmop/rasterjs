const rgbColor = require('./rgb_color.js');
const plane = require('./plane.js');
const imageLoader = require('./image_loader.js');
const tiles = require('./tiles.js');
const attributes = require('./attributes.js');
const palette = require('./palette.js');
const colorMap = require('./color_map.js');
const interrupts = require('./interrupts.js');
const sprites = require('./sprites.js');
const weak = require('./weak.js');

function isNumber(obj) {
  return typeof obj == 'number';
}

function isString(obj) {
  return typeof obj == 'string';
}

function isFunction(obj) {
  return typeof obj == 'function';
}

function isObject(obj) {
  return obj && obj.constructor.name == 'Object';
}

function isInteger(obj) {
  return Number.isInteger(obj);
}

function isArray(obj) {
  return Array.isArray(obj);
}

function isRGBColor(obj) {
  if (!obj) { return false; }
  return obj.constructor == rgbColor.RGBColor;
}

function isInterrupts(obj) {
  if (!obj) { return false; }
  return obj.constructor == interrupts.Interrupts;
}

function isTileset(obj) {
  if (!obj) { return false; }
  return obj.constructor == tiles.Tileset;
}

function isAttributes(obj) {
  if (!obj) { return false; }
  return obj.constructor == attributes.Attributes;
}

function isPalette(obj) {
  if (!obj) { return false; }
  return obj.constructor == palette.Palette;
}

function isSpriteSheet(obj) {
  if (!obj) { return false; }
  return obj.constructor == sprites.SpriteSheet;
}

function isPlane(obj) {
  if (!obj) { return false; }
  return (obj.constructor == plane.Plane ||
          obj.constructor == imageLoader.ImagePlane);
}

function isColorMap(obj) {
  if (!obj) { return false; }
  return obj.constructor == colorMap.Map;
}

function isLookOfImage(obj) {
  if (!obj) { return false; }
  return obj.constructor == imageLoader.LookOfImage;
}

function isPaletteEntry(obj) {
  if (!obj) { return false; }
  return obj.constructor == palette.PaletteEntry;
}

function isSurface(obj) {
  return obj && obj.width && obj.height && obj.pitch && obj.buff;
}

function isWeakRef(obj) {
  if (!obj) { return false; }
  return obj.constructor == weak.Ref;
}

function isDisplayObject(obj) {
  let needMethods = ['initialize',
                     'handleEvent',
                     'setSize',
                     'setRenderer',
                     'setZoom',
                     'setGrid',
                     'renderLoop'];
  for (let methodName of needMethods) {
    let method = obj[methodName];
    if (!method || !types.isFunction(method)) {
      return false;
    }
  }
  return true;
}


function ensureIsOneOf(obj, typesPossible) {
  for (let i = 0; i < typesPossible.length; i++) {
    let tp = typesPossible[i];
    if (obj.constructor.name == tp) {
      return;
    }
  }
  throw new Error(`unknown type: ${obj.constructor.name}, wanted one of ${typesPossible}`);
}

module.exports.isPlane   = isPlane;
module.exports.isNumber  = isNumber;
module.exports.isInteger = isInteger;
module.exports.isArray = isArray;
module.exports.isInterrupts = isInterrupts;
module.exports.isString = isString;
module.exports.isFunction = isFunction;
module.exports.isObject = isObject;
module.exports.isRGBColor = isRGBColor;
module.exports.isColorMap = isColorMap;
module.exports.isLookOfImage = isLookOfImage;
module.exports.isPaletteEntry = isPaletteEntry;
module.exports.isTileset = isTileset;
module.exports.isAttributes = isAttributes;
module.exports.isPalette = isPalette;
module.exports.isSpriteSheet = isSpriteSheet;
module.exports.isSurface = isSurface;
module.exports.isWeakRef = isWeakRef;
module.exports.isDisplayObject = isDisplayObject;
module.exports.ensureIsOneOf = ensureIsOneOf;
