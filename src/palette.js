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
  target.setSize(40, 20 * this.items.length);
  // TODO: I don't really like this.
  target.useStandalone();
  target.scene.saveService = this.saveService;
  target.fillTrueBackground(0x606060);
  for (let i = 0; i < this.items.length; i++) {
    let rgbInt = this.items[i].rgb.toInt();
    let y = i * 20;
    target.setTrueColor(rgbInt);
    target.fillRect(2, 2 + y, 38, 18 + y);
  }
  target.save(filename);
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
