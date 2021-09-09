const rgbColor = require('./rgb_color.js');
const plane = require('./plane.js');

function PaletteCollection(items, saveService) {
  if (saveService == null) {
    throw new Error('PaletteCollection requires a saveService');
  }
  this.items = items;
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
    target.fillRect(2, 2 + y, 36, 16);
  }
  target.save(filename);
}

PaletteCollection.prototype.toString = function() {
  return this._stringify(0, {});
}

PaletteCollection.prototype._stringify = function(depth, opts) {
  let elems = [];
  for (let i = 0; i < this.items.length; i++) {
    let val = this.items[i].hex();
    elems.push(`${i}: ${val}`);
  }
  return 'PaletteCollection{' + elems.join(', ') + '}';
}

function PaletteEntry(rgb, idx, colors) {
  if (rgb.constructor.name != 'RGBColor') {
    throw new Error(`PaletteEntry: rgb must be a RGBColor`);
  }
  if (typeof idx != 'number') {
    throw new Error(`PaletteEntry: idx must be a number`);
  }
  if (colors.constructor.name != 'Set') {
    throw new Error(`PaletteEntry: colors must be a color.Set`);
  }
  this.rgb = rgb;
  this.idx = idx;
  this.cval = idx;
  this.colors = colors;
  return this;
}

PaletteEntry.prototype.setColor = function(n) {
  this.cval = n;
  this.rgb = new rgbColor.RGBColor(this.colors.get(this.cval));
}

PaletteEntry.prototype.hex = function() {
  let text = this.rgb.toInt().toString(16);
  while (text.length < 6) {
    text = '0' + text;
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
