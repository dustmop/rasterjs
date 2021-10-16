const rgbMap = require('./rgb_map.js');
const rgbColor = require('./rgb_color.js');

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

function colorIntValsToRGBs(vals) {
  let collect = [];
  let lookup = {};
  for (let i = 0; i < vals.length; i++) {
    if (typeof vals[i] != 'number') {
      throw new Error(`type err: wanted number, got ${vals[i]}`);
    }
    let rgb = new rgbColor.RGBColor(vals[i]);
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

Set.prototype.assign = function(vals) {
  vals = vals.slice();
  let [collect, lookup] = colorIntValsToRGBs(vals);
  this.collect = collect;
  this.lookup = lookup;
  this.newIndex = this.collect.length;
}

Set.prototype.addEntry = function(rgb) {
  if (typeof rgb == 'number') {
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
  if (typeof rgb != 'number') {
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
  if (typeof rep == 'string') {
    let text = rep;
    if (text == 'quick') {
      this.assign(rgbMap.rgb_map_quick);
    } else if (text == 'dos') {
      this.assign(rgbMap.rgb_map_dos);
    } else if (text == 'nes') {
      this.assign(rgbMap.rgb_map_nes);
    } else if (text == 'gameboy') {
      this.assign(rgbMap.rgb_map_gameboy);
    } else if (text == 'pico8') {
      this.assign(rgbMap.rgb_map_pico8);
    } else if (text == 'zx-spectrum') {
      this.assign(rgbMap.rgb_map_zx_spectrum);
    } else if (text == 'c64') {
      this.assign(rgbMap.rgb_map_c64);
    } else if (text == 'grey') {
      this.assign(rgbMap.rgb_map_grey);
    } else {
      throw new Error('Unknown color set: ' + text);
    }
  } else if (Array.isArray(rep)) {
    let list = rep;
    this.assign(list);
  } else if (!rep) {
    this.assign([]);
  }
  return this.collect.length;
}

Set.prototype.append = function(list) {
  if (!Array.isArray(list)) {
    throw new Error('can only append to colorSet using a list of rgb values');
  }
  for (let i = 0; i < list.length; i++) {
    let v = list[i];
    if (typeof v != 'number') {
      throw new Error(`TODO: number err, got ${v}`);
    }
    let rgb = new rgbColor.RGBColor(v);
    this.lookup[rgb] = this.collect.length;
    this.collect.push(rgb);
  }
  // TODO: this.newIndex?
  return this.collect.length;
}

module.exports.Set = Set;
