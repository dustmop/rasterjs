function NewPaletteEntry(plane, pitch, index, color, rgb) {
  let pal = new PaletteEntry();
  // reference to the owning plane
  pal.plane = plane;
  // pitch of the image
  pal.pitch = pitch;
  // index from 8-bit values to their true color
  pal.index = index;
  // 8-bit color value
  pal.color = color;
  // true rgb value
  pal.rgb = rgb;
  return pal;
}

function PaletteEntry() {
  this.plane = null;
  this.pitch = null;
  this.index = null;
  this.color = null;
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

module.exports.NewPaletteEntry = NewPaletteEntry;
