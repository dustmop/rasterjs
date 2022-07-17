const rgbColor = require('./rgb_color.js');
const destructure = require('./destructure.js');
const types = require('./types.js');
const serializer = require('./serializer.js');


class Palette {
  constructor(items, fsacc, parentScene) {
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

  get(c) {
    return this.items[c];
  }

  reset() {
    for (let i = 0; i < this.items.length; i++) {
      let it = this.items[i];
      it.cval = it.idx;
      it.rgb = new rgbColor.RGBColor(it.colors.get(it.cval));
    }
  }

  save(filename) {
    let res = this.serialize();
    this.fsacc.saveTo(filename, res);
  }

  serialize(opt) {
    let ser = new serializer.Serializer();
    return ser.colorsToSurface(this.items, opt);
  }

  toString() {
    return this._stringify(0, {});
  }

  _stringify(depth, opts) {
    let elems = [];
    for (let i = 0; i < this.items.length; i++) {
      let it = this.items[i];
      elems.push(`${i}:[${it.cval}]=${it.hex()}`);
    }
    return 'Palette{' + elems.join(', ') + '}';
  }

  // locate where the 8-bit color value is in the palette, return the index
  find(cval) {
    for (let i = 0; i < this.items.length; i++) {
      if (cval === this.items[i].cval) {
        return i;
      }
    }
    return null;
  }

  // get the n'th color value in the palette
  lookup(n) {
    return this.items[n].cval;
  }

  // fill each value of the palette with the given value
  fill(v) {
    for (let it of this.items) {
      it.setColor(v);
    }
  }

  assign(assoc) {
    let keys = Object.keys(assoc);
    for (let key of keys) {
      this.items[key].setColor(assoc[key]);
    }
  }

  findNearPieces(needs, piece_size) {
    let num_pieces = this.items.length / piece_size;
    let winners = [];
    let ranking = [];
    for (let p = 0; p < num_pieces; p++) {
      // Get list of cotent in this piece
      let content = [];
      for (let i = 0; i < piece_size; i++) {
        let k = i + p*piece_size;
        content.push(this.items[k].cval);
      }
      // See if needs completely matches the content, if so, add to winners.
      // Otherwise, keep score and add it to ranking.
      let score = needs.filter(x => content.includes(x)).length;
      if (score == needs.length) {
        winners.push(p);
      } else {
        ranking.push({value: p, score: score});
      }
    }
    // Sort the ranking by score, from highest to lowest.
    ranking.sort((a,b) => b.score - a.score);
    return {
      winners: winners,
      ranking: ranking,
    };
  }

  cycle(args) {
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

  insertWhereAvail(rgbval) {
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

  relocateColorTo(c, pieceNum, optSize) {
    let cval = this.items[c].cval;
    for (let n = 0; n < this.items.length; n++) {
      if (c == n) { continue; }
      if (this.items[n].cval == cval) {
        return n;
      }
    }
    return null;
  }
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


class PaletteEntry {
  constructor(rgb, idx, colors) {
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

  setColor(n) {
    this.cval = Math.floor(n);
    this.rgb = new rgbColor.RGBColor(this.colors.get(this.cval));
  }

  hex() {
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

  toInt() {
    return this.rgb.toInt();
  }

  dump() {
    let ans = '';
    ans += 'PaletteEntry{';
    ans += JSON.stringify(this.rgb);
    ans += ` idx=${this.idx}`;
    ans += ` cval=${this.cval}`;
    ans += ` }`;
    return ans;
  }
}

module.exports.Palette = Palette;
module.exports.PaletteEntry = PaletteEntry;
module.exports.constructFrom = constructFrom;
