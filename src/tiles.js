function Tileset(sourceOrNum, sizeInfo) {
  if (!sizeInfo) {
    throw new Error(`Tileset requires a detail object parameter`);
  }
  if (!sizeInfo.tile_width) {
    throw new Error(`invalid Tileset detail: missing tile_width`);
  }
  if (!sizeInfo.tile_height) {
    throw new Error(`invalid Tileset detail: missing tile_height`);
  }
  if (!Math.trunc(sizeInfo.tile_width) != 0) {
    throw new Error(`Tileset's tile_width must be integer`);
  }
  if (!Math.trunc(sizeInfo.tile_height) != 0) {
    throw new Error(`Tileset's tile_height must be integer`);
  }
  if (sizeInfo.tile_width <= 0) {
    throw new Error(`Tileset's tile_width must be > 0`);
  }
  if (sizeInfo.tile_height <= 0) {
    throw new Error(`Tileset's tile_height must be > 0`);
  }

  if (typeof sourceOrNum == 'number') {
    // construct a number of tiles
    let num = sourceOrNum;
    this.tileWidth = sizeInfo.tile_width;
    this.tileHeight = sizeInfo.tile_height;
    this._constructTiles(num);
  } else if (isPlane(sourceOrNum)) {
    // load tiles by aliasing their buffers to the source
    let source = sourceOrNum;
    if (sizeInfo.tile_width > source.width) {
      throw new Error(`Tileset's tile_width is larger than source data`);
    }
    if (sizeInfo.tile_height > source.height) {
      throw new Error(`Tileset's tile_height is larger than source data`);
    }
    this.tileWidth = sizeInfo.tile_width;
    this.tileHeight = sizeInfo.tile_height;
    this._loadTilesFromSource(source);
  } else {
    throw new Error(`invalid source: ${JSON.stringify(sourceOrNum)}`);
  }

  return this;
}

Tileset.prototype.get = function(c) {
  return this.data[c];
}

Tileset.prototype._loadTilesFromSource = function(source) {
  this.numTileX = source.width / this.tileWidth;
  this.numTileY = source.height / this.tileHeight;
  this.data = new Array(this.numTileX * this.numTileY);
  // For each tile, load the data and create a tile object
  for (let yTile = 0; yTile < this.numTileY; yTile++) {
    for (let xTile = 0; xTile < this.numTileX; xTile++) {
      let k = yTile * this.numTileX + xTile;
      let t = new Tile();
      t.width = this.tileWidth;
      t.height = this.tileHeight;
      t.pitch = source.pitch;
      let offset = xTile * this.tileWidth + t.pitch * yTile * this.tileHeight;
      // Alias the buffer's data, no copy happens
      t.data = new Uint8Array(source.data.buffer, offset);
      this.data[k] = t;
    }
  }
}

Tileset.prototype._constructTiles = function(num) {
  let pitch = this.tileWidth;
  this.numTileX = num;
  this.numTileY = 1;
  this.data = new Array(num);
  // For each tile, construct an empty buffer
  for (let yTile = 0; yTile < this.numTileY; yTile++) {
    for (let xTile = 0; xTile < this.numTileX; xTile++) {
      let k = yTile * this.numTileX + xTile;
      let t = new Tile();
      t.width = this.tileWidth;
      t.height = this.tileHeight;
      t.pitch = pitch;
      t.data = new Uint8Array(this.tileHeight * pitch);
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

Tile.prototype.put = function(x, y, v) {
  let k = y * this.pitch + x;
  this.data[k] = v;
}

function isPlane(obj) {
  return obj.constructor.name == 'Plane' || obj.constructor.name == 'ImagePlane';
}

module.exports.Tileset = Tileset;
