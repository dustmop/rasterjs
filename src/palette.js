const rgbColor = require('./rgb_color.js');
const colorSet = require('./color_set.js');
const plane = require('./plane.js');
const palette = require('./palette.js');
const renderer = require('./renderer.js');
const textLoader = require('./text_loader.js');
const destructure = require('./destructure.js');

function Palette(items, saveService) {
  if (saveService != null && !saveService.saveTo) {
    throw new Error('Palette given invalid saveService');
  }
  this.items = items;
  for (let i = 0; i < items.length; i++) {
    if (items[i].constructor != palette.PaletteEntry) {
      throw new Error('Palette got invalid item[${i}], should be PaletteEntry');
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
  let target = new plane.Plane();
  // Preserve
  let preserveScene = target.scene;
  // Save operation
  target.scene = null;
  this._saveTo(target, filename);
  // Restore
  target.scene = preserveScene;
}

Palette.prototype._saveTo = function(target, savepath) {
  let numX = 8;
  let numY = Math.ceil(this.items.length / 8);
  // Parameterize
  let showWidth = 7;
  let showHeight = 5;
  let showPad = 4;
  let showBetween = 2;
  let showOuter = 3;
  // Calculate
  let offsetLeft = showOuter;
  let offsetTop = showOuter;
  let gridX = showWidth + showPad * 2 + showBetween;
  let gridY = showHeight + showPad * 2 + showBetween;
  // Draw the palette
  target.setSize(numX * gridX - showBetween + showOuter * 2,
                 numY * gridY - showBetween + showOuter * 2);

  // Create dependencies for drawing
  let loader = new textLoader.TextLoader(this.saveService);
  let font = loader.createFontResource('tiny');
  let colors = new colorSet.Set([]);
  colors.assign([]);
  let components = {
    plane: target,
    conf: {
      width: target.width,
      height: target.height,
    },
    _config: {
      width: target.width,
      height: target.height,
    },
    colorSet: colors,
    font: font,
  };

  // Draw the palette format
  target.font = font;
  target.fillColor(colors.addEntry(0x606060));
  for (let k = 0; k < this.items.length; k++) {
    let rgbInt = this.items[k].rgb.toInt();
    let j = k % 8;
    let i = Math.floor(k / 8);
    let y = i * gridY;
    let x = j * gridX;
    target.setColor(colors.addEntry(rgbInt));
    target.fillRect(x + showOuter, y + showOuter,
                    gridX - showBetween, gridY - showBetween);
    let v = k.toString();
    if (v.length < 2) {
      v = '0' + v;
    }
    if (this._isLightColor(this.items[k].rgb)) {
      target.setColor(colors.addEntry(0));
    } else {
      target.setColor(colors.addEntry(0xffffff));
    }
    target.drawText(`${v}`, x + showPad + showOuter, y + showPad + showOuter);
  }

  // Render it and save
  let rend = new renderer.Renderer();
  rend.connect(components);
  let [width, height] = rend.size();
  let surfaces = rend.render();
  this.saveService.saveTo(savepath, surfaces);
}

Palette.prototype._isLightColor = function(rgb) {
  let total = rgb.r + rgb.g + rgb.b;
  let avg = total / 3;
  return avg > 0x80;
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

Palette.prototype.rotate = function(args) {
  let spec = ['!name', 'startIndex?i', 'endIndex?i',
              'base?i', 'click?i', 'size?i'];
  let [startIndex, endIndex, base, click, size] = destructure.from(
    'rotate', spec, arguments, null);
  for (let i = startIndex; i < endIndex; i++) {
    let r = base + ((click + i) % size);
    this.items[i].setColor(r);
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
