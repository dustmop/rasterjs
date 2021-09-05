const plane = require('./plane.js');

function PaletteEntry(plane, pitch, index, color, rgb) {
  // plane is nullable
  if (typeof pitch != 'number') {
    throw 'PaletteEntry parameter `pitch` must be a number';
  }
  // index is nullable
  if (typeof color != 'number') {
    throw 'PaletteEntry parameter `color` must be a number';
  }
  if (rgb.constructor.name !== 'RGBColor') {
    throw 'PaletteEntry parameter `rgb` must be a RGBColor';
  }
  this.plane = plane;
  this.pitch = pitch;
  this.index = index;
  this.color = color;
  this.rgb = rgb;
  return this;
}

PaletteEntry.prototype.setColor = function(color) {
/*
  this.plane.setColor(color);
  let elems = this.index[this.color];
  if (!elems) {
    console.log(`color ${this.color} not found in plane`);
    return;
  }
  for (let i = 0; i < elems.length; i++) {
    let e = elems[i];
    let x = e % this.pitch;
    let y = Math.floor(e / this.pitch);
    this.plane.drawDot(x, y);
  }
*/
}

PaletteEntry.prototype.setTrueColor = function(rgb) {
/*
  let keys = Object.keys(this.index);
  for (let i = 0; i < keys.length; i++) {
    let elemLen = this.index[keys[i]].length;
  }
  let color = this.color;
  let elems = this.index[color.toString()];
  if (!elems) {
    console.log(`color ${this.color} not found in plane`);
    return;
  }
  // TODO: Fix this, add a test.
  this.plane.putColorChange(rgb, this.color, this.pitch, elems);
*/
}

PaletteEntry.prototype.hex = function() {
  let val = this.rgb.toInt().toString(16);
  while (val.length < 6) {
    val = '0' + val;
  }
  return '0x' + val;
}

function PaletteCollection(items) {
  this.items = items;
  // Let the collection be used like an Array.
  for (let i = 0; i < this.items.length; i++) {
    this[i] = this.items[i];
  }
  this.length = this.items.length;
  // Customize how console.log displays this object.
  this[Symbol.for('nodejs.util.inspect.custom')] = this._stringify;
  return this;
}

PaletteCollection.prototype.save = function(filename) {
  let target = new plane.Plane();
  target.setSize(40, 20 * this.items.length);
  target.useColors([]);
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
  for (let i = 0; i < this.length; i++) {
    let val = this[i].hex();
    elems.push(`${i}: ${val}`);
  }
  return 'PaletteCollection{' + elems.join(', ') + '}';
}

module.exports.PaletteEntry = PaletteEntry;
module.exports.PaletteCollection = PaletteCollection;
