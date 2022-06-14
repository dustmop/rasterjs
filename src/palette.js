const rgbColor = require('./rgb_color.js');
const destructure = require('./destructure.js');
const types = require('./types.js');
const serializer = require('./serializer.js');


function Palette(items, fsacc, parentScene) {
  if (fsacc != null && !fsacc.saveTo) {
    throw new Error('Palette given invalid fsacc');
  }
  this.parentScene = parentScene;
  this.items = items;
  for (let i = 0; i < items.length; i++) {
    if (items[i].constructor != PaletteEntry) {
      throw new Error(`Palette got invalid item[${i}], should be PaletteEntry`);
    }
  }
  // length
  this.length = this.items.length;
  // items are directly indexable
  for (let i = 0; i < this.items.length; i++) {
    this[i] = this.items[i];
  }
  this.fsacc = fsacc;
  // Customize how console.log displays this object.
  this[Symbol.for('nodejs.util.inspect.custom')] = this._stringify;
  return this;
}


function constructFrom(vals, offset, colors, fsacc, parentScene) {
  if (!parentScene) {
    throw new Error('constructFrom: parentScene is null');
  }
  let all = [];
  let ent;
  for (let i = 0; i < vals.length; i++) {
    let cval = vals[i];
    if (cval === null) {
      let rgb = new rgbColor.RGBColor(0);
      ent = new PaletteEntry(rgb, -1, colors);
      ent.isAvail = true;
      all.push(ent);
      continue;
    }
    if (cval >= colors.size()) {
      throw new Error(`illegal color value ${cval}, colorMap only has ${colors.size()}`);
    }
    let rgb = colors.get(cval);
    rgbColor.ensureIs(rgb);
    ent = new PaletteEntry(rgb, cval, colors);
    all.push(ent);
  }
  return new Palette(all, fsacc, parentScene);
}


Palette.prototype.get = function(c) {
  return this.items[c];
}

Palette.prototype.reset = function() {
  for (let i = 0; i < this.items.length; i++) {
    let it = this.items[i];
    it.cval = it.idx;
    it.rgb = new rgbColor.RGBColor(it.colors.get(it.cval));
  }
}

Palette.prototype.save = function(filename) {
  let res = this.serialize();
  this.fsacc.saveTo(filename, res);
}

Palette.prototype.serialize = function(opt) {
  let ser = new serializer.Serializer();
  return ser.colorsToSurface(this.items, opt);
}

Palette.prototype.toString = function() {
  return this._stringify(0, {});
}

Palette.prototype._stringify = function(depth, opts) {
  let elems = [];
  for (let i = 0; i < this.items.length; i++) {
    let it = this.items[i];
    elems.push(`${i}:[${it.cval}]=${it.hex()}`);
  }
  return 'Palette{' + elems.join(', ') + '}';
}

// locate where the 8-bit color value is in the palette, return the index
Palette.prototype.find = function(cval) {
  for (let i = 0; i < this.items.length; i++) {
    if (cval === this.items[i].cval) {
      return i;
    }
  }
  return null;
}

// get the n'th color value in the palette
Palette.prototype.lookup = function(n) {
  return this.items[n].cval;
}

// fill each value of the palette with the given value
Palette.prototype.fill = function(v) {
  for (let i = 0; i < this.items.length; i++) {
    this.items[i].setColor(v);
  }
}

Palette.prototype.assign = function(assoc) {
  let keys = Object.keys(assoc);
  for (let i = 0; i < keys.length; i++) {
    let key = keys[i];
    this.items[key].setColor(assoc[key]);
  }
}

Palette.prototype.cycle = function(args) {
  let spec = ['!name', 'startIndex?i', 'endIndex?i',
              'values?any', 'incStep?i', 'slow?i', 'click?a'];
  let [startIndex, endIndex, values, incStep, slow, click] = (
    destructure.from('cycle', spec, arguments, null));

  if (this.parentScene == null) {
    throw new Error('parentScene is not set');
  }

  if (!values) {
    values = this.parentScene.nge(0, this.length);
  } else if (types.isLookAtImage(values)) {
    if (!incStep) {
      incStep = values.density();
    }
    values = values.toInts();
  }

  endIndex = endIndex || this.length;
  incStep = Math.max(1, Math.floor(incStep));
  slow = Math.max(1, Math.floor(slow));
  click = click !== null ? click : this.parentScene.timeClick;

  let param = Math.floor(click / slow);
  let numColors = endIndex - startIndex;
  for (let k = 0; k < numColors; k++) {
    let index = k + startIndex;
    let n = (k + (param*incStep)) % values.length;
    let r = values[n];
    this.items[index].setColor(r);
  }
}

Palette.prototype.insertWhereAvail = function(rgbval) {
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

Palette.prototype.relocateColorTo = function(c, pieceNum, optSize) {
  let cval = this.items[c].cval;
  for (let n = 0; n < this.items.length; n++) {
    if (c == n) { continue; }
    if (this.items[n].cval == cval) {
      return n;
    }
  }
  return null;
}

function PaletteEntry(rgb, idx, colors) {
  if (!types.isRGBColor(rgb)) {
    throw new Error(`PaletteEntry: rgb must be a RGBColor`);
  }
  if (!types.isNumber(idx)) {
    throw new Error(`PaletteEntry: idx must be a number`);
  }
  if (!types.isColorMap(colors)) {
    throw new Error(`PaletteEntry: colors must be a color.Map`);
  }
  this.rgb = rgb;
  this.idx = idx;
  this.cval = idx;
  this.colors = colors;
  this.isAvail = false;
  return this;
}

PaletteEntry.prototype.setColor = function(n) {
  this.cval = Math.floor(n);
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

PaletteEntry.prototype.toInt = function() {
  return this.rgb.toInt();
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

module.exports.Palette = Palette;
module.exports.PaletteEntry = PaletteEntry;
module.exports.constructFrom = constructFrom;
