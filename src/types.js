const rgbColor = require('./rgb_color.js');
const plane = require('./plane.js');
const imageLoader = require('./image_loader.js');
const tiles = require('./tiles.js');
const attributes = require('./attributes.js');
const palette = require('./palette.js');
const renderer = require('./renderer.js');
const colorSet = require('./color_set.js');

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
  return obj.constructor.name == 'Object';
}

function isInteger(obj) {
  return Number.isInteger(obj);
}

function isArray(obj) {
  return Array.isArray(obj);
}

function isRGBColor(obj) {
  return obj.constructor == rgbColor.RGBColor;
}

function isInterrupts(obj) {
  return obj.constructor == renderer.Interrupts;
}

function isTileset(obj) {
  return obj.constructor == tiles.Tileset;
}

function isAttributes(obj) {
  return obj.constructor == attributes.Attributes;
}

function isPalette(obj) {
  return obj.constructor == palette.Palette;
}

function isPlane(obj) {
  return (obj.constructor == plane.Plane ||
          obj.constructor == imageLoader.ImagePlane);
}

function isColorSet(obj) {
  return obj.constructor == colorSet.Set;
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
module.exports.isColorSet = isColorSet;
module.exports.isTileset = isTileset;
module.exports.isAttributes = isAttributes;
module.exports.isPalette = isPalette;
