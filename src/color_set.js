const rgbMap = require('./rgb_map.js');
const rgbColor = require('./rgb_color.js');
const serializer = require('./serializer.js');
const types = require('./types.js');

function Set(vals) {
  let [collect, lookup] = colorIntValsToRGBs(vals);
  this._frozen = false;
  this.collect = collect;
  this.lookup = lookup;
  this.newIndex = this.collect.length;
  return this;
}

function colorIntValsToRGBs(vals, allowDups) {
  let collect = [];
  let lookup = {};
  if (!vals) {
    return [collect, lookup];
  }

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

function constructFrom(rep) {
  let make = new Set();
  make.name = null;
  if (types.isString(rep)) {
    let text = rep;
    make.name = text;
    if (text == 'quick') {
      make.assign(rgbMap.rgb_map_quick);
    } else if (text == 'dos') {
      make.assign(rgbMap.rgb_map_dos);
    } else if (text == 'nes') {
      make.assign(rgbMap.rgb_map_nes, {allowDups: true});
    } else if (text == 'gameboy') {
      make.assign(rgbMap.rgb_map_gameboy);
    } else if (text == 'pico8') {
      make.assign(rgbMap.rgb_map_pico8);
    } else if (text == 'zx-spectrum') {
      make.assign(rgbMap.rgb_map_zx_spectrum, {allowDups: true});
    } else if (text == 'c64') {
      make.assign(rgbMap.rgb_map_c64);
    } else if (text == 'grey') {
      make.assign(rgbMap.rgb_map_grey);
    } else {
      throw new Error('Unknown color set: ' + text);
    }
    make.freeze();
  } else if (types.isArray(rep)) {
    let list = rep;
    make.assign(list);
  } else if (!rep) {
    make.assign([]);
  } else {
    throw new Error('colorSet.use got unknown param ${rep}');
  }
  return make;
}

function makeDefault() {
  let make = constructFrom('quick');
  make._frozen = false;
  return make;
}

Set.prototype.size = function() {
  return this.collect.length;
}

Set.prototype.get = function(i) {
  return this.collect[i % this.collect.length];
}

Set.prototype.freeze = function() {
  this._frozen = true;
}

Set.prototype.assign = function(vals, opts) {
  if (this._frozen) {
    throw new Error(`colorSet is frozen, cannot assign`);
  }
  opts = opts || {};
  vals = vals.slice();
  let [collect, lookup] = colorIntValsToRGBs(vals, opts.allowDups);
  this.collect = collect;
  this.lookup = lookup;
  this.newIndex = this.collect.length;
}

Set.prototype.extendWith = function(rgb) {
  if (rgb !== 0 && !rgb) {
    throw new Error(`invalid rgb value: ${rgb}`);
  }
  if (types.isNumber(rgb)) {
    rgb = new rgbColor.RGBColor(rgb);
  }
  rgbColor.ensureIs(rgb);
  // Find if it already exists
  let i = this.lookup[rgb];
  if (i !== undefined) {
    return i;
  }
  if (this._frozen) {
    throw new Error(`colorSet is frozen, cannot extend with ${rgb}`);
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

Set.prototype.serialize = function(opt) {
  let ser = new serializer.Serializer();
  return ser.colorsToSurface(this.collect, opt);
}

module.exports.Set = Set;
module.exports.constructFrom = constructFrom;
module.exports.makeDefault = makeDefault;
