const types = require('./types.js');
const plane = require('./plane.js');

function Tileset(sourceOrNum, sizeInfo, opt) {
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

  this.patternTable = null;

  if (types.isNumber(sourceOrNum)) {
    // construct a number of tiles
    let num = sourceOrNum;
    this.tileWidth = sizeInfo.tile_width;
    this.tileHeight = sizeInfo.tile_height;
    this._constructTiles(num);
  } else if (types.isPlane(sourceOrNum)) {
    // load tiles by aliasing their buffers to the source
    let source = sourceOrNum;
    if (!source.width || !source.height) {
      throw new Error(`Tileset's source has invalid size`);
    }
    if (sizeInfo.tile_width > source.width) {
      throw new Error(`Tileset's tile_width is larger than source data`);
    }
    if (sizeInfo.tile_height > source.height) {
      throw new Error(`Tileset's tile_height is larger than source data`);
    }
    this.tileWidth = sizeInfo.tile_width;
    this.tileHeight = sizeInfo.tile_height;
    opt = opt || {};
    this._loadTilesFromSource(source, opt.dedup);
  } else {
    throw new Error(`invalid source: ${sourceOrNum.constructor.name}`);
  }
  this.length = this.numTiles;

  return this;
}

Tileset.prototype.get = function(i) {
  return this.data[i];
}

Tileset.prototype._loadTilesFromSource = function(source, dedup) {
  source.ensureReady();
  let pattern = [];
  let lookup = {};
  this.numTileX = source.width / this.tileWidth;
  this.numTileY = source.height / this.tileHeight;
  this.numTiles = this.numTileX * this.numTileY
  this.data = new Array(this.numTiles);
  let n = 0;
  // For each tile, load the data and create a tile object
  for (let yTile = 0; yTile < this.numTileY; yTile++) {
    for (let xTile = 0; xTile < this.numTileX; xTile++) {
      let k = yTile * this.numTileX + xTile;

      let pitch = source.pitch;
      let offset = xTile * this.tileWidth + pitch * yTile * this.tileHeight;
      let dataArray = new Uint8Array(source.data.buffer, offset);

      if (dedup) {
        let key = this._makeTileKey(dataArray,
                                    this.tileWidth, this.tileHeight, pitch);
        let val = lookup[key];
        if (val !== undefined) {
          pattern[k] = val;
          continue;
        }
        val = Object.keys(lookup).length;
        pattern[k] = val;
        lookup[key] = val;
      }

      let t = new Tile();
      t.width = this.tileWidth;
      t.height = this.tileHeight;
      t.pitch = pitch;
      t.data = dataArray;
      this.data[n] = t;
      n++;
    }
  }
  this.source = source;

  if (dedup) {
    this.data = this.data.slice(0, n);
    this.numTiles = n;
    this.patternTable = new plane.Plane();
    this.patternTable.setSize(this.numTileX, this.numTileY);
    this.patternTable._prepare();
    for (let yTile = 0; yTile < this.numTileY; yTile++) {
      for (let xTile = 0; xTile < this.numTileX; xTile++) {
        let j = yTile * this.patternTable.pitch + xTile;
        let k = yTile * this.numTileX + xTile;
        this.patternTable.data[j] = pattern[k];
      }
    }
  }
}

Tileset.prototype._constructTiles = function(num) {
  let pitch = this.tileWidth;
  this.numTileX = num;
  this.numTileY = 1;
  this.numTiles = num;
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

Tileset.prototype._makeTileKey = function(dataArray, width, height, pitch) {
  let build = [];
  let start = 0;
  for (let y = 0; y < height; y++) {
    build = build.concat(dataArray.slice(start, start+width));
    start += pitch;
  }
  return build.toString();
}

Tileset.prototype.serialize = function() {
  // TODO: Support chr-ram style tilesets, and palettes.
  let buff = this.source.rgbBuff;
  let surface = {
    width:  this.source.width,
    height: this.source.height,
    pitch:  this.source.pitch*4,
    buff:   buff,
  }
  return [surface];
}

Tileset.prototype.display = function() {
  for (let yTile = 0; yTile < this.numTileY; yTile++) {
    for (let xTile = 0; xTile < this.numTileX; xTile++) {
      let k = yTile * this.numTileX + xTile;
      let t = this.data[k];
      process.stdout.write(`Tile ${k}:\n`);
      for (let j = 0; j < this.tileHeight; j++) {
        for (let i = 0; i < this.tileWidth; i++) {
          let k = j*t.pitch + i;
          let v = t.data[k].toString(16);
          if (v.length < 2) {
            v = '0' + v;
          }
          process.stdout.write(`${v} `);
        }
        process.stdout.write('\n');
      }
      process.stdout.write('\n');
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

Tile.prototype.display = function() {
  for (let j = 0; j < this.height; j++) {
    for (let i = 0; i < this.width; i++) {
      let k = j*this.pitch + i;
      let v = this.data[k].toString(16);
      if (v.length < 2) {
        v = '0' + v;
      }
      process.stdout.write(`${v} `);
    }
    process.stdout.write('\n');
  }
}

module.exports.Tile = Tile;
module.exports.Tileset = Tileset;
