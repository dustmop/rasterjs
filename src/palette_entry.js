function NewPaletteEntry(renderer, palette, buffer, pitch, index, val) {
  let pal = new PaletteEntry();
  pal.renderer = renderer;
  pal.palette = palette;
  pal.buffer = buffer;
  pal.pitch = pitch;
  pal.index = index;
  pal.val = val;
  return pal;
}

function PaletteEntry() {
  this.renderer = null;
  this.palette = null;
  this.buffer = null;
  this.pitch = null;
  this.index = null;
  this.val = null;
  return this;
}

PaletteEntry.prototype.setColor = function(color) {
  this.renderer.setColor(color);
  let elems = this.index[this.val];
  for (let i = 0; i < elems.length; i++) {
    let e = elems[i];
    let x = e % this.pitch;
    let y = Math.floor(e / this.pitch);
    this.renderer.putPoint(x, y);
  }
}

module.exports.NewPaletteEntry = NewPaletteEntry;
