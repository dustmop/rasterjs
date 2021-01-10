function NewPaletteEntry(plane, palette, buffer, pitch, index, val) {
  let pal = new PaletteEntry();
  pal.plane = plane;
  pal.palette = palette;
  pal.buffer = buffer;
  pal.pitch = pitch;
  pal.index = index;
  pal.val = val;
  return pal;
}

function PaletteEntry() {
  this.plane = null;
  this.palette = null;
  this.buffer = null;
  this.pitch = null;
  this.index = null;
  this.val = null;
  return this;
}

PaletteEntry.prototype.setColor = function(color) {
  this.plane.setColor(color);
  let elems = this.index[this.val];
  for (let i = 0; i < elems.length; i++) {
    let e = elems[i];
    let x = e % this.pitch;
    let y = Math.floor(e / this.pitch);
    this.plane.putPoint(x, y);
  }
}

module.exports.NewPaletteEntry = NewPaletteEntry;
