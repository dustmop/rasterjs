const component = require('./component.js');
const rgbMap = require('./rgb_map.js');
const rgbColor = require('./rgb_color.js');
const destructure = require('./destructure.js');
const types = require('./types.js');
const visualizer = require('./visualizer.js');
const verboseLogger = require('./verbose_logger.js');
const weak = require('./weak.js');

let verbose = new verboseLogger.Logger();


/**
 * Palette is the map of RGB data to 8-bit colors, and entries for reordering
 */
class Palette extends component.Component {

  /**
   * construct a new palette
   * @param {object} opt - options. pieceSize, rgbmap
   */
  constructor(opt) {
    super();
    opt = (opt || {});
    if (!types.isObject(opt)) {
      throw new Error(`palette constructor expected options, got ${opt}`);
    }
    this.name = null;
    this.expandable = true;
    this._rgbmap = null;
    this._entries = null;
    this._system = null;
    this._pieceSize = opt.pieceSize || null;
    if (opt.rgbmap) {
      this._rgbmap = toIntList(opt.rgbmap);
    }
    if (opt.entries) {
      this.setEntries(opt.entries);
    }
  }

  kind() {
    return 'palette';
  }

  /**
   * assign to the rgbmap, and remove all entries. Assign name if one exists
   * @param {Array} values - values to assign to the rgbmap
   */
  setRGBMap(values) {
    if (values.name) {
      this.name = values.name;
    }
    this._entries = null;
    this._rgbmap = toIntList(values);
  }

  /**
   * append a value to the rgbmap, if not already present
   * @param {Array} values - values to assign to the rgbmap
   */
  addRGBMap(rgbval) {
    // TODO: allow list of values?
    if (!this.expandable) {
      throw new Error(`rgbmap is not expandable`);
    }
    rgbval = toNum(rgbval);
    if (this._rgbmap == null) {
      this._rgbmap = [];
    }
    let len = this._rgbmap.length;
    for (let i = 0; i < len; i++) {
      if (this._rgbmap[i] == rgbval) {
        return i;
      }
    }
    this._rgbmap.push(rgbval);
    return len;
  }

  isPending() {
    return !this._rgbmap;
  }

  isExpandable() {
    return this.expandable;
  }

  /**
   * assign values to the palette entries
   * @param {Number | Array} vals - either number of entries or the entry values
   */
  setEntries(vals) {
    if (types.isNumber(vals)) {
      this._entries = [...Array(Math.floor(vals)).keys()].slice();
      return;
    }

    if (types.isArray(vals)) {
      let entries = [];
      for (let v of vals) {
        entries.push(Math.floor(v));
      }
      this._entries = entries;
      return;
    }

    throw new Error(`invalid param for setEntries: ${JSON.stringify(vals)}`);
  }

  entriesToInts() {
    return this._entries.slice();
  }

  get length() {
    if (this._entries) {
      return this._entries.length;
    }
    return this._rgbmap.length;
  }

  get(n) {
    if (this._entries == null) {
      return this._rgbmap[n];
    }
    return this._rgbmap[this.entries[i]];
  }

  fill(v) {
    this.ensureEntries();
    for (let i = 0; i < this._entries.length; i++) {
      this._entries[i] = v;
    }
  }

  find(subject) {
    this.ensureEntries();
    if (types.isNumber(subject)) {
      for (let i = 0; i < this._entries.length; i++) {
        if (subject === this._entries[i]) {
          return i;
        }
      }
    } else if (types.isString(subject)) {
      let idealrgb = new rgbColor.RGBColor(this._idealColor(subject));
      let closest = null;
      let winner = -1;
      for (let i = 0; i < this.length; i++) {
        let delta = idealrgb.diff(new rgbColor.RGBColor(this.getRGB(i)));
        if (winner == -1 || delta < closest) {
          closest = delta;
          winner = i;
        }
      }
      return winner;
    } else {
      throw new Error(`invalid value to find: "${JSON.stringify(subject)}"`);
    }
    return -1;
  }

  _idealColor(name) {
    if (name == 'white') {
      return 0xffffff;
    } else if (name == 'grey') {
      return 0x888888;
    } else if (name == 'black') {
      return 0x000000;
    }
    // TODO: support more html color names
    throw new Error(`unknown color name: "${name}"`);
  }

  locateRGB(rgbval) {
    // TODO: should this use the _entries?
    let map;
    if (this.isPending()) {
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

  roundNearestColor(rgbval) {
    let input = new rgbColor.RGBColor(rgbval);
    let closest = null;
    let winner = -1;
    for (let i = 0; i < this._rgbmap.length; i++) {
      let delta = input.diff(new rgbColor.RGBColor(this._rgbmap[i]));
      if (winner == -1 || delta < closest) {
        closest = delta;
        winner = i;
      }
    }
    return winner;
  }

  reset() {
    this.ensureEntries();
    for (let i = 0; i < this._entries.length; i++) {
      this._entries[i] = i;
    }
  }

  assign(assoc) {
    this.ensureEntries();
    let keys = Object.keys(assoc);
    for (let key of keys) {
      this._entries[key] = toNum(assoc[key]);
    }
  }

  put(n, v) {
    this.ensureRGBMap();
    this.ensureEntries();
    if (!types.isNumber(v)) {
      throw new Error(`TODO`);
    }
    this._entries[n] = v;
  }

  /**
   * get an entry from the palette
   * @param {int} n - the entry to get
   */
  entry(n) {
    this.ensureRGBMap();
    this.ensureEntries();
    return new PaletteEntry(n, this._entries[n], new weak.Ref(this));
  }

  cycle(args, opt) {
    this._cycleTopLevel(args, opt);
  }

  visualize(opt) {
    opt = opt || {};
    this.ensureRGBMap();
    let viz = new visualizer.Visualizer();
    let colors = [];
    let entries = null;
    if (this._entries && !opt.rgbmap) {
      entries = [];
      for (let i = 0; i < this._entries.length; i++) {
        colors.push(this._rgbmap[this._entries[i]]);
        entries.push(this._entries[i]);
      }
    } else {
      for (let i = 0; i < this._rgbmap.length; i++) {
        colors.push(this._rgbmap[i]);
      }
    }
    return viz.rgbListToSurface(colors, entries, opt);
  }

  toString(opt) {
    opt = opt || {};
    return this._stringify(0, opt);
  }

  getRGB(n) {
    this.ensureRGBMap();
    if (this._entries) {
      // TODO: mod entries?
      n = this._entries[n];
    }
    return this._rgbmap[Math.floor(n) % this._rgbmap.length]
  }

  getRGBUsing(n, outtuple, rgbmap) {
    if (this._entries) {
      n = this._entries[Math.floor(n) % this._entries.length];
    }
    let v = +rgbmap[Math.floor(n) % rgbmap.length];
    outtuple[0] = (v / 0x10000) % 0x100;
    outtuple[1] = (v / 0x100)   % 0x100;
    outtuple[2] = (v / 0x1)     % 0x100;
    outtuple[3] = 0xff;
  }

  giveFeatures(refScene) {
    // palette.cycle needs `scene.tick`
    if (!types.isWeakRef(refScene)) {
      throw new Error(`giveFeatures needs a weak.Ref(scene)`);
    }
    this._refScene = refScene;
  }

  findNearPieces(colorNeeds, pieceSize) {
    if (!pieceSize) {
      pieceSize = this._pieceSize || 8;
    }

    this.ensureEntries();
    for (let nc of colorNeeds) {
      if (!types.isRGBColor(nc)) {
        throw new Error(`findNearPieces requires list of rgb colors`);
      }
    }
    let numPieces = this._entries.length / pieceSize;
    let winners = [];
    let ranking = [];
    for (let p = 0; p < numPieces; p++) {
      // get list of rgb items in this piece of the palette
      let rgbVals = [];
      for (let i = 0; i < pieceSize; i++) {
        let k = i + p*pieceSize;
        rgbVals.push(this.getRGB(k));
      }
      // See if needs completely matches the content, if so, add to winners.
      // Otherwise, keep score and add it to ranking.
      let score = colorNeeds.filter(c => rgbVals.includes(c.toInt())).length;
      if (score == colorNeeds.length) {
        winners.push(p);
      } else if (score > 0) {
        ranking.push({piece: p, score: score});
      }
    }
    // Sort the ranking by score, from highest to lowest.
    ranking.sort((a,b) => b.score - a.score);
    return {
      winners: winners,
      ranking: ranking,
    };
  }

  agreeWithMe(pl) {
    if (!types.isField(pl)) {
      throw new Error(`agreeWithMe needs a Field`);
    }

    let remap = {};
    for (let i = 0; i < this._rgbmap.length; i++) {
      let cval = this._entries[i];
      // palette with multiple uses will only map to the first
      // TODO: this doesn't work with colorspace, need ambiguity info
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
    this.ensureRGBMap();
    if (this._entries) {
      return;
    }
    this._entries = [...Array(Math.floor(this._rgbmap.length)).keys()].slice();
  }

  ensureRGBMap() {
    if (this.isPending()) {
      verbose.log(`creating default rgbMap`, 4);
      this._rgbmap = rgbMap.rgb_map_quick.slice();
    }
  }

  ensureExpandingIfCurrentlyPending() {
    if (this.isPending()) {
      verbose.log(`creating empty and expanding rgbMap`, 4);
      this._rgbmap = [];
      this.expandable = true;
    }
  }

  _stringify(depth, opts) {
    this.ensureRGBMap();
    let prefix = 'Palette';
    let segments = [];
    let len = 0;
    if (this._entries && !opts.rgbmap) {
      len = this._entries.length;
    } else if (opts.rgbmap) {
      prefix = 'Palette.rgbmap'
      len = this._rgbmap.length;
    } else {
      len = this._rgbmap.length;
    }
    for (let i = 0; i < len; i++) {
      let n = i;
      if (this._entries && !opts.rgbmap) {
        n = this._entries[i];
      }
      if (n == null) {
        segments.push(`${i}:null`);
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
      if (opts.rgbmap) {
        segments.push(`${i}:${rgb}`);
      } else {
        segments.push(`${i}:[${n}]=${rgb}`);
      }
    }
    return prefix + '{' + segments.join(', ') + '}';
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
        // `upon` value can be look, or the number `0`
        if (types.isLookOfImage(cycleUpon)) {
          params.upon = cycleUpon._items;
        } else if (cycleUpon === 0) {
          // create list of upon values, add to params
          // these upon will change the iteration order for cycle
          params.upon = look._items.slice(0, look._density);
        } else {
          throw new Error(`unknown upon value ${upon}`);
        }
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

    this.ensureEntries();

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
    tick = tick !== null ? tick : ra.tick;

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
      if (index === undefined) {
        continue;
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


class PaletteEntry {
  constructor(idx, cval, refOwner) {
    if (!types.isNumber(idx)) {
      throw new Error(`PaletteEntry: idx must be a number`);
    }
    if (!types.isWeakRef(refOwner)) {
      throw new Error(`PaletteEntry: ref must be a weak.Ref`);
    }

    let pal = refOwner.deref();
    this.idx = idx;
    this.cval = cval;
    this.rgb = new rgbColor.RGBColor(pal._rgbmap[cval]);
    this.refOwner = refOwner;
    return this;
  }

  setColor(n) {
    if (types.isPaletteEntry(n)) {
      n = n.cval;
    }
    if (!types.isNumber(n)) {
      throw new Error(`setColor: n must be a number, got ${JSON.stringify(n)}`);
    }
    n = Math.floor(n);

    let pal = this.refOwner.deref();
    this.cval = n;
    this.rgb = new rgbColor.RGBColor(pal._rgbmap[n]);
    pal._entries[this.idx] = n;
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

  getRGB() {
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

function toIntList(vals) {
  let res = [];
  for (let e of vals) {
    res.push(Math.floor(e));
  }
  return res;
}

function constructRGBMapFrom(rep) {
  if (rep == null) {
    return null;
  }
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
  } else {
    throw new Error('rgbmap got unknown param ${rep}');
  }
  return make;
}

function buildFrom(param, opt) {
  opt = opt || {};
  let spec = ['!name', 'name?s', 'rgbmap?a', 'entries?a',
              'numEntries?a', 'pieceSize?i', 'upon?a'];
  let [name, rgbmap, entries, numEntries, pieceSize, upon] = (
    destructure.from('usePalette', spec, [param], null));

  if (!entries && numEntries) {
    entries = [...Array(numEntries).keys()].slice();
  }
  if (!entries && opt.copy) {
    entries = opt.copy._entries;
  }
  if (!rgbmap && opt.copy) {
    rgbmap = opt.copy._rgbmap;
  }
  let make = new Palette({rgbmap: rgbmap, entries: entries});
  if (name) {
    make.name = name;
  }
  if (pieceSize) {
    make.pieceSize = pieceSize;
  }
  if (opt.copy) {
    make._refScene = opt.copy._refScene;
  }
  // TODO: upon
  return make;
}

module.exports.Palette = Palette;
module.exports.PaletteEntry = PaletteEntry;
module.exports.constructRGBMapFrom = constructRGBMapFrom;
module.exports.buildFrom = buildFrom;
