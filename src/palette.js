const rgbMap = require('./rgb_map.js');
const rgbColor = require('./rgb_color.js');
const destructure = require('./destructure.js');
const types = require('./types.js');
const serializer = require('./serializer.js');
const verboseLogger = require('./verbose_logger.js');

let verbose = new verboseLogger.Logger();


/**
 * Palette is the map of RGB data to 8-bit colors, and entries for reordering
 */
class Palette {

  constructor(opt) {
    opt = (opt || {});
    this._rgbmap = opt.rgbmap; // TODO: validate
    this._entries = null;
    this._pending = false;
    this._expandable = false;
    this._system = null;
    this._pieceSize = null;
  }

  setRGBMap(values) {
    let res = [];
    for (let elem of values) {
      res.push(Math.floor(elem));
    }
    this._rgbmap = res;
    this._pending = false;
  }

  addRGBMap(rgbval) {
    rgbval = toNum(rgbval);
    if (this._rgbmap == null) {
      this._rgbmap = [];
      this._pending = false;
    }
    let len = this._rgbmap.length;
    for (let i = 0; i < len; i++) {
      if (this._rgbmap[i] == rgbval) {
        return i;
      }
    }
    this._rgbmap.push(rgbval);
    let m = this._rgbmap[len-1];
    return len;
  }

  setPending() {
    this._pending = true;
  }

  isPending() {
    return this._pending;
  }

  isExpandable() {
    // TODO: test, will affect image down-sampling
    return true;
  }

  get length() {
    return this._entries.length;
  }

  fill(num) {
    this.ensureEntries();
    for (let it of this._entries) {
      it.setColor(toNum(num));
    }
  }

  find(byte) {
    this.ensureEntries();
    for (let i = 0; i < this._entries.length; i++) {
      if (byte === this._entries[i]) {
        return i;
      }
    }
    return null;
  }

  locateRGB(rgbval) {
    // TODO: should this use the _entries?
    let map;
    if (!this._rgbmap || this.isPending()) {
      map = rgbMap.rgb_map_quick;
    } else {
      map = this._rgbmap;
    }
    for (let i = 0; i < map.length; i++) {
      if (map[i] == rgbval) {
        return i;
      }
    }
    return null;
  }

  reset() {
    for (let i = 0; i < this._entries.length; i++) {
      this._entries[i] = i;
    }
  }

  assign(assoc) {
    // TODO: fix me and test
    this.ensureEntries();
    let keys = Object.keys(assoc);
    for (let key of keys) {
      this._entries[key].setColor(assoc[key]);
    }
  }

  put(n, v) {
    this.ensureRGBMap();
    this.ensureEntries();
    this._entries[n] = v;
  }

  /**
   * get an entry from the palette
   * @param {int} n - the entry to get
   */
  entry(n) {
    this.ensureRGBMap();
    this.ensureEntries();
    let val = this._entries[n];
    return new PaletteEntry(new rgbColor.RGBColor(this._rgbmap[val]), val);
  }

  cycle(args, opt) {
    this._cycleTopLevel(args, opt);
  }

  save(filename) {
    if (!this._fsacc) {
      throw new Error(`cannot save without fsacc`);
    }
    let res = this.serialize();
    this._fsacc.saveTo(filename, res);
  }

  serialize(opt) {
    let ser = new serializer.Serializer();
    let vals = [];
    if (this._entries) {
      for (let i = 0; i < this._entries.length; i++) {
        vals.push(this._rgbmap[this._entries[i]]);
      }
    } else {
      for (let i = 0; i < this._rgbmap.length; i++) {
        vals.push(this._rgbmap[i]);
      }
    }
    return ser.colorsToSurface(vals, opt);
    // TODO: serialize rgbMap alone
  }

  toString() {
    return this._stringify(0, {});
  }

  getRGB(n) {
    this.ensureRGBMap();
    if (this._entries) {
      n = this._entries[n];
    }
    return this._rgbmap[Math.floor(n) % this._rgbmap.length]
  }

  getRGBUsing(n, rgbmap) {
    if (this._entries) {
      n = this._entries[n];
    }
    return rgbmap[Math.floor(n) % rgbmap.length]
  }

  giveFeatures(fsacc, refScene) {
    // palette.save needs `fsacc.saveTo`
    this._fsacc = fsacc;
    // palette.cycle needs `scene.timeTick`
    this._refScene = refScene;
  }

  findNearPieces() {
    throw new Error(`TODO: findNearPieces`);
  }

  agreeWithMe(pl) {
    if (!types.isPlane(pl)) {
      throw new Error(`agreeWithMe needs a Plane`);
    }

    let remap = {};
    for (let i = 0; i < this._rgbmap.length; i++) {
      let cval = this._entries[i];
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
    let entries = this._entries;

    // get all uncovered palette entries
    let replace = [];
    for (let i = 0; i < entries.length; i++) {
      let cv = entries[i];
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
    this._entries = replace;
  }

  relocateColorTo(c, pieceNum, optSize) {
    let rgbint = this.getRGB(c);
    let startIndex = pieceNum * optSize;
    for (let i = 0; i < optSize; i++) {
      let n = i + startIndex;
      if (this.getRGB(n) == rgbint) {
        return i;
      }
    }
    return null;
  }

  ensureEntries() {
    if (this._entries) {
      return;
    }
    let vals = [];
    for (let i = 0; i < this._rgbmap.length; i++) {
      vals[i] = i;
    }
    this._entries = vals;
  }

  ensureRGBMap() {
    if (this.isPending()) {
      verbose.log(`creating default rgbMap`, 4);
      this._rgbmap = rgbMap.rgb_map_quick;
      this._pending = false;
    }
  }

  ensureExpandingIfCurrentlyPending() {
    if (this.isPending()) {
      verbose.log(`creating empty and expanding rgbMap`, 4);
      this._rgbmap = [];
      this._pending = false;
      this._expandable = true;
    }
  }

  _stringify(depth, opts) {
    this.ensureRGBMap();
    let elems = [];
    if (this._entries == null) {
      return 'Palette{null}';
    }
    for (let i = 0; i < this._entries.length; i++) {
      let n = this._entries[i];
      if (n == null) {
        elems.push(`${i}:null`);
        continue
      }
      if (!types.isNumber(n)) {
        throw new Error(`bad type of entry: ${n}`);
      }
      let rgb = this._rgbmap[n].toString(16);
      while (rgb.length < 6) {
        rgb = '0' + rgb;
      }
      rgb = '0x' + rgb;
      elems.push(`${i}:[${n}]=${rgb}`);
    }
    return 'Palette{' + elems.join(', ') + '}';
  }

  _cycleTopLevel(firstArg, opt) {
    if (types.isLookOfImage(firstArg)) {
      let look = firstArg;
      opt = opt || {};

      let params = {};
      params.startIndex = opt.startIndex || this._uncoveredNum || 0;
      params.values = look.toInts();
      params.incStep = look.density();
      params.slow = opt.slow || null;
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
    this._cycleParams(firstArg);
  }

  _cycleParams(args) {
    let spec = ['!name', 'startIndex?i', 'endIndex?i',
                'values?any', 'incStep?i', 'slow?i', 'tick?a', 'upon?a'];
    let [startIndex, endIndex, values, incStep, slow, tick, upon] = (
      destructure.from('cycle', spec, arguments, null));
    let stepReason = '';

    if (this._refScene == null) {
      throw new Error('refScene is not set');
    }
    let ra = this._refScene.deref();

    if (startIndex && upon) {
      throw new Error(`cannot use {upon} with {startIndex}`);
    }

    // TODO: uncovered will always override 0, but it defaults to 0
    startIndex = startIndex || this._uncoveredNum || 0;

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
      this._entries[index] = r;
    }
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
  constructor(rgb, idx) {
    if (!types.isRGBColor(rgb)) {
      throw new Error(`PaletteEntry: rgb must be a RGBColor`);
    }
    if (!types.isNumber(idx)) {
      throw new Error(`PaletteEntry: idx must be a number`);
    }
    this.rgb = rgb;
    this.idx = idx;
    this.cval = idx;
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

function toNum(n) {
  if (n == null) {
    return 0;
  } else if (types.isNumber(n)) {
    return n;
  } else if (types.isRGBColor(n)) {
    return n.toInt();
  }
  throw new Error(`toNum: unknown type of ${n}`);
}

function constructRGBMapFrom(rep) {
  let make = [];
  if (types.isString(rep)) {
    let text = rep;
    if (text == 'quick') {
      make = rgbMap.rgb_map_quick.slice();
    } else if (text == 'dos') {
      make = rgbMap.rgb_map_dos.slice();
    } else if (text == 'nes') {
      make = rgbMap.rgb_map_nes.slice();
    } else if (text == 'gameboy') {
      make = rgbMap.rgb_map_gameboy.slice();
    } else if (text == 'pico8') {
      make = rgbMap.rgb_map_pico8.slice();
    } else if (text == 'zx-spectrum') {
      make = rgbMap.rgb_map_zx_spectrum.slice();
    } else if (text == 'c64') {
      make = rgbMap.rgb_map_c64.slice();
    } else if (text == 'grey') {
      make = rgbMap.rgb_map_grey.slice();
    } else {
      throw new Error('unknown color set: ' + text);
    }
    make.name = text;
  } else if (types.isArray(rep)) {
    let list = rep;
    make = list.slice();
  } else if (!rep) {
    make = [];
  } else {
    throw new Error('rgbmap got unknown param ${rep}');
  }
  return make;
}

module.exports.Palette = Palette;
module.exports.PaletteEntry = PaletteEntry;
module.exports.constructRGBMapFrom = constructRGBMapFrom;
