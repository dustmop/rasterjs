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
  // For each tile, load the rgb buffer and create a tile object
  for (let yTile = 0; yTile < this.numTileY; yTile++) {
    for (let xTile = 0; xTile < this.numTileX; xTile++) {
      let k = yTile * this.numTileX + xTile;
      let t = new Tile();
      t.width = this.tileWidth;
      t.height = this.tileHeight;
      t.pitch = t.width * 4;
      t.rgbBuff = new Uint8Array(t.width * t.height * 4);
      for (let i = 0; i < this.tileHeight; i++) {
        for (let j = 0; j < this.tileWidth; j++) {
          let y = yTile * this.tileHeight + i;
          let x = xTile * this.tileWidth + j;
          //let s = y * this.tileWidth + x;
          let s = i * this.tileWidth + j;
          let n = y * this.numTileX * this.tileWidth + x;
          //console.log(`i=${i} j=${j}, y=${y} x=${x} s=${s} n=${n}`);
          t.rgbBuff[s*4+0] = this.img.rgbBuff[n*4+0];
          t.rgbBuff[s*4+1] = this.img.rgbBuff[n*4+1];
          t.rgbBuff[s*4+2] = this.img.rgbBuff[n*4+2];
          t.rgbBuff[s*4+3] = this.img.rgbBuff[n*4+3];
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

Tile.prototype.getRGB = function(x, y) {
  let k = y * this.width + x;
  let b = this.rgbBuff;
  return [b[k*4+0], b[k*4+1], b[k*4+2]];
}

module.exports.TileSet = TileSet;
