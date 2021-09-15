const rgbMap = require('./rgb_map.js');

function Set(vals) {
  if (!vals) {
    vals = rgbMap.rgb_map_quick;
  }
  // TODO: vals should hold RGBColor objects
  this.vals = vals;
  this.newIndex = this.vals.length;
  return this;
}

Set.prototype.clear = function() {
  this.assign(rgbMap.rgb_map_quick);
}

Set.prototype.size = function() {
  return this.vals.length;
}

Set.prototype.get = function(i) {
  return this.vals[i % this.vals.length];
}

Set.prototype.assign = function(vals) {
  this.vals = vals.slice();
  this.newIndex = vals.length;
}

Set.prototype.addEntry = function(rgb) {
  for (let i = 0; i < this.vals.length; i++) {
    let c = this.vals[i];
    if (c === rgb) {
      return i;
    }
  }
  // Add it to the map
  let i = this.newIndex % 0x100;
  this.vals[i] = rgb;
  this.newIndex = (i + 1) % 0x100;
  return i;
}

Set.prototype.find = function(rgb) {
  for (let i = 0; i < this.vals.length; i++) {
    let c = this.vals[i];
    if (c === rgb) {
      return i;
    }
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
      throw 'Unknown color set: ' + text;
    }
  } else if (Array.isArray(rep)) {
    let list = rep;
    this.assign(list);
  } else if (!rep) {
    this.assign([]);
  }
}

module.exports.Set = Set;
