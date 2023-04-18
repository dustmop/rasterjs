const rgbColor = require('./rgb_color.js');
const field = require('./field.js');
const baseDisplay = require('./base_display.js');
const imageField = require('./image_field.js');
const tiles = require('./tiles.js');
const colorspace = require('./colorspace.js');
const palette = require('./palette.js');
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

function is2dNumArray(obj) {
  if (!isArray(obj)) {
    return false;
  }
  for (let i = 0; i < obj.length; i++) {
    let row = obj[i];
    if (!isArray(row)) {
      return false;
    }
    for (let j = 0; j < row.length; j++) {
      let cell = row[j];
      if (!isNumber(cell)) {
        return false;
      }
    }
  }
  return true;
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

function isTile(obj) {
  if (!obj) { return false; }
  return obj.constructor == tiles.Tile;
}

function isColorspace(obj) {
  if (!obj) { return false; }
  return obj.constructor == colorspace.Colorspace;
}

function isPalette(obj) {
  if (!obj) { return false; }
  return obj.constructor == palette.Palette;
}

function isSpriteSheet(obj) {
  if (!obj) { return false; }
  return obj.constructor == sprites.SpriteSheet;
}

function isField(obj) {
  if (!obj) { return false; }
  return (obj.constructor == field.Field ||
          obj.constructor == imageField.ImageField);
}

function isLookOfImage(obj) {
  if (!obj) { return false; }
  return obj.constructor == imageField.LookOfImage;
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
  return obj instanceof baseDisplay.BaseDisplay;
}

function ensureKeys(obj, allowed) {
  let keys = Object.keys(obj);
  for (let i = 0; i < keys.length; i++) {
    if (allowed.indexOf(keys[i]) == -1) {
      throw new Error(`unknown key "${keys[i]}"`);
    }
  }
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

module.exports.isField   = isField;
module.exports.isNumber  = isNumber;
module.exports.isInteger = isInteger;
module.exports.isArray = isArray;
module.exports.is2dNumArray = is2dNumArray;
module.exports.isInterrupts = isInterrupts;
module.exports.isString = isString;
module.exports.isFunction = isFunction;
module.exports.isObject = isObject;
module.exports.isRGBColor = isRGBColor;
module.exports.isLookOfImage = isLookOfImage;
module.exports.isPaletteEntry = isPaletteEntry;
module.exports.isTile = isTile;
module.exports.isTileset = isTileset;
module.exports.isColorspace = isColorspace;
module.exports.isPalette = isPalette;
module.exports.isSpriteSheet = isSpriteSheet;
module.exports.isSurface = isSurface;
module.exports.isWeakRef = isWeakRef;
module.exports.isDisplayObject = isDisplayObject;
module.exports.ensureKeys = ensureKeys;
module.exports.ensureIsOneOf = ensureIsOneOf;
