const rgbColor = require('./rgb_color.js');
const field = require('./field.js');
const tiles = require('./tiles.js');
const types = require('./types.js');

class Spritelist {
  constructor(numSprites, resource) {
    // ensure first param is a number
    if (!types.isNumber(numSprites)) {
      throw new Error(`first param must be a number, got ${numSprites}`);
    }
    // ensure second param is a Tileset, or SpriteSheet, or has `chardat`
    let chardat;
    if (resource === null || resource === undefined) {
      // pass
    } else if (types.isTileset(resource) || types.isSpriteSheet(resource)) {
      chardat = resource;
    } else if (types.isObject(resource) && types.isArray(resource.chardat)) {
      chardat = new ArrayWrapper(resource.chardat);
    } else {
      throw new Error(`second param must be Tileset, or SpriteSheet, or object with 'chardat' array`);
    }

    let items = new Array(numSprites);
    for (let i = 0; i < items.length; i++) {
      let item = new Sprite();
      items[i] = item;
      this[i] = item;
    }
    this.items = items;
    this.length = items.length;
    this.chardat = chardat;
    this.enabled = true;
    return this;
  }

  clear() {
    this.items = new Array(0);
    this.length = 0;
    this.enabled = true;
  }

  createChar(opt, createFunc) {
    let num = opt.num;
    let x = opt.x;
    let y = opt.y;
    let chardat = [];
    for (let i = 0; i < num; i++) {
      let f = new field.Field();
      f.setSize(x, y);
      createFunc(f, i);
      chardat.push(f);
    }
    this.chardat = new ArrayWrapper(chardat);
    this.enabled = true;
  }

  set(index, properties) {
    let sprite = new Sprite();
    sprite.assign(properties);
    this.items[index] = sprite;
    this[index] = this.items[index];
    this.length = this.items.length;
  }

  toString() {
    let result = [];
    for (let i = 0; i < this.items.length; i++) {
      let item = this.items[i];
      result.push({x: Math.floor(item.x), y: Math.floor(item.y), c: item.c, p: item.p});
    }
    return JSON.stringify(result);
  }
}


class Sprite {
  constructor() {
    let item = this;
    item.x = null;
    item.y = null;
    item.c = null;
    item.m = null;
    item.p = null;
    item.i = null;
    item.h = null;
    item.v = null;
    item.b = null;
    return item;
  }

  assign(other) {
    for (let k of Object.keys(other)) {
      this[k] = other[k];
    }
  }
}

// each Sprite contains:
// x, y   position
// c      character
// m      mix
// p      palette offset or piece
// i      invisible
// h, v   flips
// b      behind

class SpriteSheet {
  constructor(pl, info) {
    // TODO: Needs better error handling
    let loader = pl.refLoader.deref();
    let loaderScene = loader.refScene.deref();
    let palette = loaderScene.palette;
    palette.ensureRGBMap();
    let rgbBorder = new rgbColor.RGBColor(info.trueColorBorder);
    let border = palette.locateRGB(rgbBorder.toInt());
    this._parseSpriteSheet(pl, border);
    return this;
  }

  get(i) {
    return this.data[i];
  }

  _parseSpriteSheet(pl, border) {
    let res = [];
    let rect = {x:0, y:0, r:pl.width-1, d:pl.height-1};
    parseSpritesFromSheetPortion(res, pl, border, rect);

    let numChars = res.length;
    let data = new Array(numChars);
    for (let i = 0; i < numChars; i++) {
      let border = res[i];
      let slice = {x:border.x+1, y:border.y+1};
      let offset = slice.y * pl.pitch + slice.x;
      // TODO: Don't need to use tile, it's just a generic field.
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


class ArrayWrapper {
  constructor(chardat) {
    this.data = chardat;
    this.length = this.data.length;
    return this;
  }

  get(i) {
    return this.data[i];
  }
}


module.exports.Spritelist = Spritelist;
module.exports.SpriteSheet = SpriteSheet;
// for testing
module.exports.buildRecursiveCases = buildRecursiveCases;
module.exports.parseSpritesFromSheetPortion = parseSpritesFromSheetPortion;
