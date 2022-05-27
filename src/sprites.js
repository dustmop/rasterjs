const rgbColor = require('./rgb_color.js');
const tiles = require('./tiles.js');
const types = require('./types.js');

function SpriteList(chardat) {
  let numSprites = chardat.length;
  let items = new Array(numSprites);
  for (let i = 0; i < items.length; i++) {
    let item = new Sprite();
    items[i] = item;
    this[i] = item;
  }
  this.items = items;
  this.length = items.length;
  if (types.isArray(chardat)) {
    chardat = new ArrayWrapper(chardat);
  }
  this.chardat = chardat;
  return this;
}

SpriteList.prototype.ensureValid = function() {
  for (let i = 0; i < this.length; i++) {
    this.items[i]._ensureIntPos();
  }
}

function Sprite() {
  let item = this;
  item.x = null;
  item.y = null;
  item.c = null;
  item.m = null;
  item.a = null;
  item.i = null;
  item.h = null;
  item.v = null;
  item.b = null;
  return item;
}

Sprite.prototype._ensureIntPos = function() {
  this.x = Math.floor(this.x);
  this.y = Math.floor(this.y);
}

// each Sprite contains:
// x, y   position
// c      character
// m      mix
// a      attribute (which piece of the palette)
// i      invisible
// h, v   flips
// b      behind

function SpriteSheet(pl, info) {
  // TODO: Needs better error handling
  let loaderScene = pl.parentLoader.scene;
  loaderScene._ensureColorMap();
  let colorMap = loaderScene.colorMap;
  let rgbBorder = new rgbColor.RGBColor(info.trueColorBorder);
  let border = colorMap.find(rgbBorder.toInt());
  this._parseSpriteSheet(pl, border);
  return this;
}

SpriteSheet.prototype.get = function(i) {
  return this.data[i];
}

SpriteSheet.prototype._parseSpriteSheet = function(pl, border) {
  let res = [];
  let rect = {x:0, y:0, r:pl.width-1, d:pl.height-1};
  parseSpritesFromSheetPortion(res, pl, border, rect);

  let numChars = res.length;
  let data = new Array(numChars);
  for (let i = 0; i < numChars; i++) {
    let border = res[i];
    let slice = {x:border.x+1, y:border.y+1};
    let offset = slice.y * pl.pitch + slice.x;
    // TODO: Don't need to use tile, it's just a generic plane.
    let ch = new tiles.Tile();
    ch.width = border.r - border.x - 1;
    ch.height = border.d - border.y - 1;
    ch.pitch = pl.pitch;
    ch.data = new Uint8Array(pl.data.buffer, offset);
    data[i] = ch;
  }
  this.length = numChars;
  this.data = data;
}

function parseSpritesFromSheetPortion(res, pl, needle, rect) {
  for (let y = rect.y; y <= rect.d; y++) {
    for (let x = rect.x; x <= rect.r; x++) {
      let c = pl.get(x, y);
      if (c == needle) {
        let border = traceSpriteBorder(pl, needle, x, y)
        if (border.x == border.r || border.y == border.d) {
          // Hacky, but it fixes our test case
          continue;
        }
        res.push(border);

        let recurseCases = buildRecursiveCases(rect, border);
        parseSpritesFromSheetPortion(res, pl, needle, recurseCases[0]);
        parseSpritesFromSheetPortion(res, pl, needle, recurseCases[1]);
        parseSpritesFromSheetPortion(res, pl, needle, recurseCases[2]);
        return;
      }
    }
  }
}

function traceSpriteBorder(pl, needle, left, top) {
  let x = left;
  let y = top;
  let c = null;
  // go right
  x++;
  while (x < pl.width) {
    c = pl.get(x, y);
    if (c != needle) {
      x--;
      break;
    }
    x++;
  }
  let right = x;
  // go down
  y++;
  while (y < pl.height) {
    c = pl.get(x, y);
    if (c != needle) {
      y--;
      break;
    }
    y++;
  }
  let down = y;
  // TODO: Go left, then up, to validate that the border is complete.
  return {x: left, y: top, r: right, d: down};
}

function buildRecursiveCases(rect, border) {
  let cases = [];

  let recurseLeft = {x: rect.x, y: border.y+1, r: border.x-1, d: border.d};
  cases.push(recurseLeft);

  let recurseBelow = {x: border.r+1, y: border.y, r: rect.r, d: border.d};
  cases.push(recurseBelow);

  let recurseRight = {x: rect.x, y: border.d+1, r: rect.r, d: rect.d};
  cases.push(recurseRight);

  return cases;
}

function ArrayWrapper(chardat) {
  this.data = chardat;
  this.length = this.data.length;
  return this;
}

ArrayWrapper.prototype.get = function(i) {
  return this.data[i];
}

module.exports.SpriteList = SpriteList;
module.exports.SpriteSheet = SpriteSheet;
// for testing
module.exports.buildRecursiveCases = buildRecursiveCases;
module.exports.parseSpritesFromSheetPortion = parseSpritesFromSheetPortion;
