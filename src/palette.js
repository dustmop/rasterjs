const rgbColor = require('./rgb_color.js');
const colorSet = require('./color_set.js');
const plane = require('./plane.js');
const palette = require('./palette.js');

function PaletteCollection(items, saveService) {
  if (saveService != null && !saveService.saveTo) {
    throw new Error('PaletteCollection given invalid saveService');
  }
  this.items = items;
  for (let i = 0; i < items.length; i++) {
    if (items[i].constructor != palette.PaletteEntry) {
      throw new Error('PaletteCollection got invalid item[${i}], should be PaletteEntry');
    }
  }
  // length
  this.length = this.items.length;
  // items are directly indexable
  for (let i = 0; i < this.items.length; i++) {
    this[i] = this.items[i];
  }
  this.saveService = saveService;
  // Customize how console.log displays this object.
  this[Symbol.for('nodejs.util.inspect.custom')] = this._stringify;
  return this;
}

PaletteCollection.prototype.get = function(c) {
  return this.items[c];
}

PaletteCollection.prototype.reset = function() {
  for (let i = 0; i < this.items.length; i++) {
    let it = this.items[i];
    it.cval = it.idx;
    it.rgb = new rgbColor.RGBColor(it.colors.get(it.cval));
  }
}

PaletteCollection.prototype.save = function(filename) {
  let target = new plane.Plane();
  // Preserve
  let preservePalette = target.scene.palette;
  let preserveFont = target.scene.font;
  // Nullify
  target.scene.palette = null;
  target.scene.font = null;
  this._saveTo(target, filename);
  // Restore
  target.scene.palette = preservePalette;
  target.scene.font = preserveFont;
}

PaletteCollection.prototype._saveTo = function(target, filename) {
  let numX = 8;
  let numY = Math.ceil(this.items.length / 8);
  // Parameterize
  let showWidth = 7;
  let showHeight = 5;
  let showPad = 4;
  let showBetween = 2;
  let showOuter = 3;
  // Calculate
  let offsetLeft = showOuter;
  let offsetTop = showOuter;
  let gridX = showWidth + showPad * 2 + showBetween;
  let gridY = showHeight + showPad * 2 + showBetween;
  // Draw the palette
  target.setSize(numX * gridX - showBetween + showOuter * 2,
                 numY * gridY - showBetween + showOuter * 2);
  target.scene.saveService = this.saveService;
  target.scene.setFont(this.saveService.localAsset('asset/tiny.yaff'));
  target.fillTrueBackground(0x606060);
  for (let k = 0; k < this.items.length; k++) {
    let rgbInt = this.items[k].rgb.toInt();
    let j = k % 8;
    let i = Math.floor(k / 8);
    let y = i * gridY;
    let x = j * gridX;
    target.setTrueColor(rgbInt);
    target.fillRect(x + showOuter, y + showOuter,
                    gridX - showBetween, gridY - showBetween);
    let v = k.toString();
    if (v.length < 2) {
      v = '0' + v;
    }
    if (this._isLightColor(this.items[k].rgb)) {
      target.setTrueColor(0);
    } else {
      target.setTrueColor(0xffffff);
    }
    target.drawText(`${v}`, x + showPad + showOuter, y + showPad + showOuter);
  }
  target.save(filename);
}

PaletteCollection.prototype._isLightColor = function(rgb) {
  let total = rgb.r + rgb.g + rgb.b;
  let avg = total / 3;
  return avg > 0x80;
}

PaletteCollection.prototype.toString = function() {
  return this._stringify(0, {});
}

PaletteCollection.prototype._stringify = function(depth, opts) {
  let elems = [];
  for (let i = 0; i < this.items.length; i++) {
    let it = this.items[i];
    elems.push(`${i}:[${it.cval}]=${it.hex()}`);
  }
  return 'PaletteCollection{' + elems.join(', ') + '}';
}

PaletteCollection.prototype.find = function(cval) {
  for (let n = 0; n < this.items.length; n++) {
    let ent = this.items[n];
    if (cval === ent.cval) {
      return n;
    }
  }
  return null;
}

PaletteCollection.prototype.insertWhereAvail = function(rgbval) {
  for (let n = 0; n < this.items.length; n++) {
    let ent = this.items[n];
    if (ent.isAvail) {
      ent.cval = 0;
      ent.isAvail = false;
      ent.drop = rgbval;
      return n;
    }
  }
  return null;
}

function PaletteEntry(rgb, idx, colors) {
  if (rgb.constructor != rgbColor.RGBColor) {
    throw new Error(`PaletteEntry: rgb must be a RGBColor`);
  }
  if (typeof idx != 'number') {
    throw new Error(`PaletteEntry: idx must be a number`);
  }
  if (colors.constructor != colorSet.Set) {
    throw new Error(`PaletteEntry: colors must be a color.Set`);
  }
  this.rgb = rgb;
  this.idx = idx;
  this.cval = idx;
  this.colors = colors;
  this.isAvail = false;
  return this;
}

PaletteEntry.prototype.setColor = function(n) {
  this.cval = n;
  this.rgb = new rgbColor.RGBColor(this.colors.get(this.cval));
}

PaletteEntry.prototype.hex = function() {
  let text = this.rgb.toInt().toString(16);
  if (this.drop) {
    text = this.drop.toString(16);
  }
  while (text.length < 6) {
    text = '0' + text;
  }
  if (this.drop) {
    return '(0x' + text + ')';
  }
  return '0x' + text;
}

PaletteEntry.prototype.dump = function() {
  let ans = '';
  ans += 'PaletteEntry{';
  ans += JSON.stringify(this.rgb);
  ans += ` idx=${this.idx}`;
  ans += ` cval=${this.cval}`;
  ans += ` }`;
  return ans;
}

module.exports.PaletteCollection = PaletteCollection;
module.exports.PaletteEntry = PaletteEntry;
