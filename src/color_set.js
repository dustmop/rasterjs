const rgbMap = require('./rgb_map.js');
const rgbColor = require('./rgb_color.js');
const serializer = require('./serializer.js');
const types = require('./types.js');

function Set(vals) {
  if (!vals) {
    vals = rgbMap.rgb_map_quick;
  }
  let [collect, lookup] = colorIntValsToRGBs(vals);
  this.collect = collect;
  this.lookup = lookup;
  this.newIndex = this.collect.length;
  return this;
}

function colorIntValsToRGBs(vals, allowDups) {
  let collect = [];
  let lookup = {};
  for (let i = 0; i < vals.length; i++) {
    if (!types.isNumber(vals[i])) {
      throw new Error(`type err: wanted number, got ${vals[i]}`);
    }
    let rgb = new rgbColor.RGBColor(vals[i]);
    if (lookup[rgb] !== undefined && !allowDups) {
      throw new Error(`duplicate color in set: ${rgb}`);
    }
    lookup[rgb] = collect.length;
    collect.push(rgb);
  }
  return [collect, lookup];
}

Set.prototype.clear = function() {
  this.assign(rgbMap.rgb_map_quick);
}

Set.prototype.size = function() {
  return this.collect.length;
}

Set.prototype.get = function(i) {
  return this.collect[i % this.collect.length];
}

Set.prototype.assign = function(vals, opts) {
  opts = opts || {};
  vals = vals.slice();
  let [collect, lookup] = colorIntValsToRGBs(vals, opts.allowDups);
  this.collect = collect;
  this.lookup = lookup;
  this.newIndex = this.collect.length;
}

Set.prototype.addEntry = function(rgb) {
  if (types.isNumber(rgb)) {
    rgb = new rgbColor.RGBColor(rgb);
  }
  rgbColor.ensureIs(rgb);
  // Find if it already exists
  let i = this.lookup[rgb];
  if (i !== undefined) {
    return i;
  }
  // Add it to the map
  i = this.newIndex % 0x100;
  this.lookup[rgb] = this.collect.length;
  this.collect[i] = rgb;
  this.newIndex = (i + 1) % 0x100;
  return i;
}

Set.prototype.find = function(rgb) {
  if (!types.isNumber(rgb)) {
    throw new Error('colorSet needs rgb as a number');
  }
  rgb = new rgbColor.RGBColor(rgb);
  let i = this.lookup[rgb];
  if (i !== undefined) {
    return i;
  }
  return -1;
}

Set.prototype.use = function(rep) {
  this.name = null;
  if (types.isString(rep)) {
    let text = rep;
    this.name = text;
    if (text == 'quick') {
      this.assign(rgbMap.rgb_map_quick);
    } else if (text == 'dos') {
      this.assign(rgbMap.rgb_map_dos);
    } else if (text == 'nes') {
      this.assign(rgbMap.rgb_map_nes, {allowDups: true});
    } else if (text == 'gameboy') {
      this.assign(rgbMap.rgb_map_gameboy);
    } else if (text == 'pico8') {
      this.assign(rgbMap.rgb_map_pico8);
    } else if (text == 'zx-spectrum') {
      this.assign(rgbMap.rgb_map_zx_spectrum, {allowDups: true});
    } else if (text == 'c64') {
      this.assign(rgbMap.rgb_map_c64);
    } else if (text == 'grey') {
      this.assign(rgbMap.rgb_map_grey);
    } else {
      throw new Error('Unknown color set: ' + text);
    }
  } else if (types.isArray(rep)) {
    let list = rep;
    this.assign(list);
  } else if (!rep) {
    this.assign([]);
  } else {
    throw new Error('colorSet.use got unknown param ${rep}');
  }
  return this.collect.length;
}

Set.prototype.append = function(list) {
  if (!types.isArray(list)) {
    throw new Error('can only append to colorSet using a list of rgb values');
  }
  for (let i = 0; i < list.length; i++) {
    let v = list[i];
    if (!types.isNumber(v)) {
      throw new Error(`TODO: number err, got ${v}`);
    }
    let rgb = new rgbColor.RGBColor(v);
    this.lookup[rgb] = this.collect.length;
    this.collect.push(rgb);
  }
  // TODO: this.newIndex?
  return this.collect.length;
}

Set.prototype.serialize = function(opt) {
  let ser = new serializer.Serializer();
  return ser.colorsToSurface(this.collect, opt);
}

module.exports.Set = Set;
