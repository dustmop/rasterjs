const rgbColor = require('./rgb_color.js');
const destructure = require('./destructure.js');
const types = require('./types.js');
const serializer = require('./serializer.js');
const verboseLogger = require('./verbose_logger.js');

let verbose = new verboseLogger.Logger();


class Palette {
  constructor(items, fsacc, refScene) {
    if (fsacc != null && !fsacc.saveTo) {
      throw new Error('Palette given invalid fsacc');
    }
    this.refScene = refScene;
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
    this._uncoveredNum = 0;
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
      if (!it) {
        elems.push(`${i}:null`);
        continue
      }
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
    let myArgs = arguments;
    let firstArg = myArgs[0];
    if (types.isLookOfImage(firstArg)) {
      let look = firstArg;
      let opt = arguments[1] || {};
      let params = {};
      params.startIndex = opt.startIndex || this._uncoveredNum;
      params.values = look.toInts();
      params.incStep = look.density();
      params.slow = opt.slow || null;
      //params.stepReason = ` [look.density = ${values.density()}]`;
      params.endIndex = look.density() + params.startIndex;
      if (opt.tick) {
        params.tick = opt.tick;
      }

      if (opt.upon !== null && opt.upon !== undefined) {
        let cycleUpon = opt.upon;
        if (cycleUpon !== 0) {
          throw new Error(`not implemented: palette.cycle(look, {upon}) except for {upon: 0}`);
        }
        // create list of upon values, add to params
        // these upon will change the iteration order for cycle
        params.upon = look._items.slice(0, look._density);
      }

      this._cycleParams(params);
      return;
    }
    this._cycleParams(myArgs[0]);
  }

  _cycleParams(args) {
    let spec = ['!name', 'startIndex?i', 'endIndex?i',
                'values?any', 'incStep?i', 'slow?i', 'tick?a', 'upon?a'];
    let [startIndex, endIndex, values, incStep, slow, tick, upon] = (
      destructure.from('cycle', spec, arguments, null));
    let stepReason = '';

    if (this.refScene == null) {
      throw new Error('refScene is not set');
    }
    let ra = this.refScene.deref();

    if (startIndex && upon) {
      throw new Error(`cannot use {upon} with {startIndex}`);
    }

    // TODO: uncovered will always override 0, but it defaults to 0
    startIndex = startIndex || this._uncoveredNum;

    if (!values) {
      values = ra.nge(0, this.length);
    } else if (types.isLookOfImage(values)) {
      values = values.toInts();
    }

    endIndex = endIndex || this.length;
    incStep = Math.max(1, Math.floor(incStep));
    slow = Math.max(1, Math.floor(slow));
    tick = tick !== null ? tick : ra.timeTick;

    tick = Math.floor(tick / slow);
    let numColors = endIndex - startIndex;

    if (!this._hasDisplayedCycleCall) {
      verbose.log(`palette.cycle(
  values = ${values},
  startIndex = ${startIndex}, endIndex = ${endIndex}, incStep = ${incStep}${stepReason},
  tick = ${tick} / numColors = ${numColors}
)`, 6);
    }

    for (let k = 0; k < numColors; k++) {
      let index = k + startIndex;
      if (upon) {
        index = upon[k];
      }
      let n = (k + (tick*incStep)) % values.length;
      let r = values[n];
      if (!this._hasDisplayedCycleCall) {
        verbose.log(`entry[${index}].setColor(${r})`, 6);
      }
      this.items[index].setColor(r);
    }

    //this._hasDisplayedCycleCall = true;
  }

  agreeWithMe(pl) {
    if (!types.isPlane(pl)) {
      throw new Error(`agreeWithMe needs a Plane`);
    }

    let remap = {};
    for (let i = 0; i < this.items.length; i++) {
      let cval = this.items[i].cval;
      // palette with multiple uses will only map to the first
      // TODO: this doesn't work with attributes, need ambiguity info
      remap[cval] = i;
    }

    for (let y = 0; y < pl.height; y++) {
      for (let x = 0; x < pl.width; x++) {
        let v = pl.get(x, y);
        v = remap[v];
        pl.put(x, y, v);
      }
    }
  }

  agreeWithThem(coverageLook) {
    if (!types.isLookOfImage(coverageLook)) {
      throw new Error(`agreeWithThem needs a LookOfImage`);
    }
    let entries = this.items;

    // get all uncovered palette entries
    let replace = [];
    for (let i = 0; i < entries.length; i++) {
      let cv = entries[i].cval;
      let index = coverageLook.find(cv);
      if (index != -1) {
        continue;
      }
      replace.push(entries[i]);
    }
    this._uncoveredNum = replace.length;

    // get all covered palette values
    let coveredVals = coverageLook.toInts();
    // TODO: replace with `allToInts` or `rowsToInts`
    let follow = [];
    for (let i = 0; i < coveredVals.length; i++) {
      follow.push(entries[coveredVals[i]]);
    }

    // concat them together and build this palette
    replace = replace.concat(follow);
    this.items = replace;
    this.length = this.items.length;
    for (let i = 0; i < this.items.length; i++) {
      this[i] = this.items[i];
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

function constructFrom(vals, offset, colors, fsacc, refScene) {
  if (!refScene) {
    throw new Error('constructFrom: refScene is null');
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
  return new Palette(all, fsacc, refScene);
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
