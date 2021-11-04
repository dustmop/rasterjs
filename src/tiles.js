function TileSet(source, sizeInfo, saveService) {
  this.source = source;
  this.tileWidth = sizeInfo.tile_width;
  this.tileHeight = sizeInfo.tile_height;
  this.saveService = saveService;
  this._loadTiles();
  return this;
}

TileSet.prototype.get = function(c) {
  return this.data[c];
}

TileSet.prototype._loadTiles = function() {
  this.numTileX = this.source.width / this.tileWidth;
  this.numTileY = this.source.height / this.tileHeight;
  this.data = new Array(this.numTileX * this.numTileY);
  // For each tile, load the data and create a tile object
  for (let yTile = 0; yTile < this.numTileY; yTile++) {
    for (let xTile = 0; xTile < this.numTileX; xTile++) {
      let k = yTile * this.numTileX + xTile;
      let t = new Tile();
      t.width = this.tileWidth;
      t.height = this.tileHeight;
      t.pitch = this.source.pitch;
      let offset = xTile * this.tileWidth + t.pitch * yTile * this.tileHeight;
      t.data = new Uint8Array(this.source.data.buffer, offset);
      this.data[k] = t;
    }
  }
}

function Tile() {
  this.width = null;
  this.height = null;
  this.pitch = null;
  this.data = null;
  return this;
}

Tile.prototype.get = function(x, y) {
  let k = y * this.pitch + x;
  return this.data[k];
}

module.exports.TileSet = TileSet;
