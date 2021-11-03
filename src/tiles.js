function TileSet(img, sizeInfo, saveService) {
  // TODO: type check here
  this.img = img;
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
  let q = 0;
  this.numTileX = this.img.width / this.tileWidth;
  this.numTileY = this.img.height / this.tileHeight;
  this.data = new Array(this.numTileX * this.numTileY);
  // For each tile, load the data and create a tile object
  for (let yTile = 0; yTile < this.numTileY; yTile++) {
    for (let xTile = 0; xTile < this.numTileX; xTile++) {
      let k = yTile * this.numTileX + xTile;
      let t = new Tile();
      t.width = this.tileWidth;
      t.height = this.tileHeight;
      t.pitch = t.width * 4;
      t.data = new Uint8Array(t.width * t.height * 4);
      for (let i = 0; i < this.tileHeight; i++) {
        for (let j = 0; j < this.tileWidth; j++) {
          let y = yTile * this.tileHeight + i;
          let x = xTile * this.tileWidth + j;
          let s = i * this.tileWidth + j;
          let n = y * this.numTileX * this.tileWidth + x;
          t.data[s+0] = this.img.data[n+0];
          t.data[s+1] = this.img.data[n+1];
          t.data[s+2] = this.img.data[n+2];
          t.data[s+3] = this.img.data[n+3];
        }
      }
      this.data[k] = t;
    }
  }
}

function Tile() {
  this.width = null;
  this.height = null;
  this.data = null;
  return this;
}

Tile.prototype.get = function(x, y) {
  let k = y * this.width + x;
  return this.data[k];
}

module.exports.TileSet = TileSet;
