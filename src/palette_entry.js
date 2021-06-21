const plane = require('./plane.js');

function PaletteEntry(plane, pitch, index, color, rgb) {
  this.plane = plane;
  this.pitch = pitch;
  this.index = index;
  this.color = color;
  this.rgb = rgb;
  return this;
}

PaletteEntry.prototype.setColor = function(color) {
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
}

PaletteEntry.prototype.setTrueColor = function(rgb) {
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
}

PaletteEntry.prototype.hex = function() {
  let val = this.rgb.toString(16);
  while (val.length < 6) {
    val = '0' + val;
  }
  return '0x' + val;
}

function PaletteCollection(env, res, items) {
  this.env = env;
  this.res = res;
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
  return savePaletteCollection(this.env, this.res, this, filename);
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

function savePaletteCollection(env, resources, pc, filename) {
  let rawBuffer = env.makeRawBuffer(resources);
  let target = new plane.Plane(rawBuffer, {saveService: resources});
  target.setSize(40, 20 * pc.length);
  target.assignRgbMap([]);
  target.fillTrueBackground(0x606060);
  for (let i = 0; i < pc.length; i++) {
    let rgb = pc[i].rgb;
    let y = i * 20;
    target.setTrueColor(rgb);
    target.fillRect(2, 2 + y, 36, 16);
  }
  target.save(filename);
}

module.exports.PaletteEntry = PaletteEntry;
module.exports.PaletteCollection = PaletteCollection;
