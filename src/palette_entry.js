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
    this.plane.putDot(x, y);
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
  this.plane.putColorChange(rgb, this.color, this.pitch, elems);
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
    let val = this[i].rgb.toString(16);
    while (val.length < 6) {
      val = '0' + val;
    }
    elems.push(`${i}: 0x${val}`);
  }
  return 'PaletteCollection{' + elems.join(', ') + '}';
}

function savePaletteCollection(env, res, pc, filename) {
  let target = env.makePlane(res);
  target.setSize(40, 20 * pc.length);
  target.clearRgbMap();
  let color = target.addRgbMapEntry(0x606060);
  target.fillBackground(color);
  for (let i = 0; i < pc.length; i++) {
    let rgb = pc[i].rgb;
    let y = i * 20;
    let color = target.addRgbMapEntry(rgb);
    target.setColor(color);
    target.putRect(2, 2 + y, 36, 16, true);
  }
  target.saveTo(filename);
}

module.exports.PaletteEntry = PaletteEntry;
module.exports.PaletteCollection = PaletteCollection;
