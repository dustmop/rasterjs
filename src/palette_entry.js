function NewPaletteEntry(plane, pitch, index, color, rgb) {
  return new PaletteEntry(plane, pitch, index, color, rgb);
}

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

function NewPaletteCollection(env, res, items) {
  let make = items;
  make.save = function(filename) {
    return savePaletteCollection(env, res, make, filename);
  }
  return make;
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

module.exports.NewPaletteEntry = NewPaletteEntry;
module.exports.PaletteEntry = PaletteEntry;
module.exports.NewPaletteCollection = NewPaletteCollection;
