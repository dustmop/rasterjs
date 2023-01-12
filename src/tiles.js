const types = require('./types.js');
const plane = require('./plane.js');
const visualizer = require('./visualizer.js');

class Tileset {
  constructor(sizeInfo) {
    sizeInfo = sizeInfo || {};

    let deserializeData = null;
    if (sizeInfo.deserialize) {
      let text = sizeInfo.deserialize;
      deserializeData = JSON.parse(text);
      sizeInfo = {
        tile_width: deserializeData.tileWidth,
        tile_height: deserializeData.tileHeight,
      }
    }
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

    Object.defineProperty(this, 'pattternTable', {
      get() {
        throw new Error(`tileset.patternTable is invalid`);
      }
    });

    this.tileWidth = sizeInfo.tile_width;
    this.tileHeight = sizeInfo.tile_height;
    this.data = [];
    this._lookupContents = {};

    if (sizeInfo.num) {
      this._constructNumTiles(sizeInfo.num);
    }

    if (deserializeData) {
      for (let row of deserializeData['data']) {
        let pitch = this.tileWidth;
        let data = new Uint8Array(pitch * this.tileHeight);
        for (let k = 0; k < row.length; k++) {
          data[k] = row[k];
        }
        this.data.push(this._createTileObject(data, pitch));
      }
      this._fillContents();
    }

    return this;
  }

  clone() {
    let detail = {tile_width: this.tileWidth, tile_height: this.tileHeight};
    let make = new Tileset(detail);
    make.giveFeatures(this._fsacc);
    make.data = this.data.slice();
    make._palette = this._palette;
    make._fillContents();
    return make;
  }

  newTile() {
    let pitch = this.tileWidth;
    let t = new Tile();
    t.width = this.tileWidth;
    t.height = this.tileHeight;
    t.pitch = pitch;
    t.data = new Uint8Array(pitch * this.tileHeight);
    return t;
  }

  clear() {
    this.data = [];
    this._lookupContents = {};
  }

  isEmpty() {
    return this.data.length == 0;
  }


  _fillContents() {
    this.numTiles = this.data.length;
    // TODO: _lookupContents
  }

  giveFeatures(fsacc) {
    this._fsacc = fsacc;
  }

  get(i) {
    return this.data[i];
  }

  put(i, t) {
    if (!types.isTile(t)) {
      throw new Error(`can only put Tile to tileset`);
    }
    this.data[i] = t;
  }

  get length() {
    return this.data.length;
  }

  push(tile) {
    return this.add(tile, true);
  }

  add(tile, allowDups) {
    if (!types.isTile(tile)) {
      throw new Error(`required: Tile, got ${JSON.stringify(tile)}`);
    }
    if (tile.width != this.tileWidth) {
      throw new Error(`expected: tileWidth ${this.tileWidth} got ${tile.width}`);
    }
    if (tile.height != this.tileHeight) {
      throw new Error(`expected: tileHeight ${this.tileHeight} got ${tile.height}`);
    }
    allowDups = allowDups || false;

    let pitch = tile.pitch;
    let key = this._makeKey(tile.data, pitch);
    let tileID;

    if (!allowDups) {
      tileID = this._lookupContents[key];
      if (tileID != null) {
        return tileID;
      }
    }

    tileID = this.data.length;
    this.data.push(tile.clone());
    this._lookupContents[key] = tileID;
    this.numTiles = this.data.length;
    return tileID;
  }

  /**
   * carve up the plane into tiles, add them to this tileset
   * @param {Plane} pl - the plane to create tiles from
   * @param {bool} allowDups - whether to allow duplicates (or combine them)
   * @return {PatternTable} the pattern table for the added tiles
   */
  addFrom(pl, allowDups) {
    if (!types.isPlane(pl)) {
      throw new Error(`addFrom requires a Plane`);
    }
    if (this.tileHeight > pl.height) {
      throw new Error(`Tileset's tile_height is larger than source data`);
    }
    if (this.tileWidth > pl.width) {
      throw new Error(`Tileset's tile_width is larger than source data`);
    }
    allowDups = allowDups || false;

    pl.ensureReady();
    let pitch = pl.pitch;
    let source = pl.data.slice();

    // TODO: add a test for when rounding happens
    let numTilesX = Math.floor(pl.width / this.tileWidth);
    let numTilesY = Math.floor(pl.height / this.tileHeight);

    let patternData = new Array(numTilesX * numTilesY);
    let patternPitch = numTilesX;

    for (let tileY = 0; tileY < numTilesY; tileY++) {
      for (let tileX = 0; tileX < numTilesX; tileX++) {
        let tileData = this._sliceTileData(tileX, tileY, source, pl.pitch);
        let tileID;
        if (allowDups) {
          tileID = this.data.length;
          this.data.push(this._createTileObject(tileData, pitch));
        } else {
          let key = this._makeKey(tileData, pitch);
          tileID = this._lookupContents[key];
          if (tileID == null) {
            // tile is not a duplicate, it is a new tile
            tileID = this.data.length;
            this._lookupContents[key] = tileID;
            this.data.push(this._createTileObject(tileData, pitch));
          }
        }
        let k = tileX + tileY * patternPitch;
        patternData[k] = tileID;
      }
    }

    this.numTiles = this.data.length;
    return new PatternTable(patternData, patternPitch, numTilesX, numTilesY);
  }

  insertFrom(other, opt) {
    if (!types.isTileset(other)) {
      throw new Error(`required: Tileset, got ${JSON.stringify(other)}`);
    }

    let num = (opt || {}).num;
    if (!num) {
      num = other.length;
    }

    for (let i = 0; i < num; i++) {
      let t = other.get(i);
      if (!t) {
        t = this.newTile();
      }
      // allow duplicates
      this.push(t);
    }
  }


  all() {
    return this.data;
  }

  _createTileObject(data, pitch) {
    let obj = new Tile();
    obj.width = this.tileWidth;
    obj.height = this.tileHeight;
    obj.pitch = pitch;
    obj.data = data;
    return obj;
  }

  _makeKey(data, pitch) {
    let build = [];
    let start = 0;
    for (let y = 0; y < this.tileHeight; y++) {
      build = build.concat(data.slice(start, start+this.tileWidth));
      start += pitch;
    }
    return build.toString();
  }

  _sliceTileData(tileX, tileY, sourceData, pitch) {
    let offset = tileX * this.tileWidth + pitch * tileY * this.tileHeight;
    return new Uint8Array(sourceData.buffer, offset);
  }

  _constructNumTiles(num) {
    let pitch = this.tileWidth;
    this.numTiles = num;
    this.data = new Array(num);
    for (let i = 0; i < this.data.length; i++) {
      let t = new Tile();
      t.width = this.tileWidth;
      t.height = this.tileHeight;
      t.pitch = pitch;
      t.data = new Uint8Array(t.height * pitch);
      this.data[i] = t;
    }
  }

  save(filename) {
    if (!this._fsacc) {
      throw new Error(`cannot save without fsacc`);
    }
    let res = this.visualize({palette: this._palette, numTileX: 16});
    this._fsacc.saveTo(filename, res);
  }

  serialize() {
    let data = [];
    for (let tile of this.data) {
      let bytes = [];
      for (let y = 0; y < tile.height; y++) {
        for (let x = 0; x < tile.width; x++) {
          bytes.push(tile.get(x, y));
        }
      }
      data.push(bytes);
    }
    let obj = {
      "tileWidth": this.tileWidth,
      "tileHeight": this.tileHeight,
      "data": data,
    };
    return JSON.stringify(obj);
  }

  visualize(opt) {
    opt = opt || {};
    let numTileX = opt.numTileX || 8;
    let palette = opt.palette || (function() {
      throw new Error('no palette');
    })();
    let twidth = this.tileWidth;
    let theight = this.tileHeight;
    let viz = new visualizer.Visualizer();
    return viz.tilesetToSurface(this.data, palette, twidth, theight, numTileX);
  }

  display() {
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
}


class Tile {
  constructor(width, height) {
    let pitch = Math.floor(width);
    let data;
    if (pitch > 0 && height > 0) {
      data = new Uint8Array(height * pitch);
    }
    this.width = Math.floor(width);
    this.height = Math.floor(height);
    this.pitch = pitch;
    this.data = data;
    return this;
  }

  get(x, y) {
    if (x == null) { throw new Error(`get: x is null`); }
    if (y == null) { throw new Error(`get: y is null`); }
    let k = y * this.pitch + x;
    return this.data[k];
  }

  put(x, y, v) {
    if (x == null) { throw new Error(`put: x is null`); }
    if (y == null) { throw new Error(`put: y is null`); }
    let k = y * this.pitch + x;
    this.data[k] = v;
  }

  clone() {
    let make = new Tile();
    make.width = this.width;
    make.height = this.height;
    make.pitch = this.pitch;
    make.data = this.data;
    return make;
  }

  display() {
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

  fill(v) {
    if (types.isArray(v)) {
      let k = 0;
      for (let i = 0; i < this.height; i++) {
        for (let j = 0; j < this.width; j++) {
          this.put(j, i, v[k]);
          k++;
        }
      }
      return;
    }
    if (types.isNumber(v)) {
      for (let k = 0; k < this.data.length; k++) {
        this.data[k] = Math.floor(v);
      }
      return;
    }
    throw new Error(`tile.fill needs array or number, got ${v}`);
  }

}


class PatternTable {
  constructor(data, pitch, width, height) {
    this.data = data;
    this.pitch = pitch;
    this.width = width;
    this.height = height;
  }

  get(x, y) {
    let k = x + y * this.pitch;
    return this.data[k];
  }

  put(x, y, v) {
    let k = x + y * this.pitch;
    this.data[k] = v;;
  }

  serialize() {
    let obj = {
      "width": this.width,
      "height": this.height,
      "data": this.data,
    };
    return JSON.stringify(obj);
  }

  toPlane() {
    // "Why is a PatternTable not just a Plane"?
    //
    // A Plane is defined to hold 8-bit values. But a PatternTable
    // is allowed to have arbitrary values, since a Tileset is allowed
    // to have any num of tiles. This method down-samples to an 8-bit
    // plane by truncating large values
    let pl = new plane.Plane();
    pl.setSize(this.width, this.height);
    pl.fill(this.data);
    return pl;
  }

}


module.exports.Tile = Tile;
module.exports.Tileset = Tileset;
