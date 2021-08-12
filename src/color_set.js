function Set(rgbMap) {
  this.rgbMap = rgbMap;
  this.newIndex = this.rgbMap.length;
  return this;
}

Set.prototype.assignRgbMap = function(rgbmap) {
  this.rgbMap = rgbmap.slice();
  this.newIndex = this.rgbMap.length;
}

Set.prototype.addRgbMapEntry = function(rgb) {
  for (let i = 0; i < this.rgbMap.length; i++) {
    let c = this.rgbMap[i];
    if (c == rgb) {
      return i;
    }
  }
  // Add it to the map
  let i = this.newIndex % 0x100;
  this.rgbMap[i] = rgb;
  this.newIndex = (i + 1) % 0x100;
  return i;
}

module.exports.Set = Set;
