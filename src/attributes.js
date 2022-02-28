const types = require('./types.js');

function Attributes(source, sizeInfo) {
  if (!source && !sizeInfo) {
    throw new Error(`Attributes expects an argument`);
  }
  if (!sizeInfo) {
    throw new Error(`Attributes requires a detail object parameter`);
  }
  if (!sizeInfo.cell_width) {
    throw new Error(`invalid Attributes detail: missing cell_width`);
  }
  if (!sizeInfo.cell_height) {
    throw new Error(`invalid Attributes detail: missing cell_height`);
  }
  if (!sizeInfo.piece_size) {
    throw new Error(`invalid Attributes detail: missing piece_size`);
  }
  if (!Math.trunc(sizeInfo.cell_width) != 0) {
    throw new Error(`Attributes's cell_width must be integer`);
  }
  if (!Math.trunc(sizeInfo.cell_height) != 0) {
    throw new Error(`Attributes's cell_height must be integer`);
  }
  if (!Math.trunc(sizeInfo.piece_size) != 0) {
    throw new Error(`Attributes's piece_size must be integer`);
  }
  if (sizeInfo.cell_width <= 0) {
    throw new Error(`Attributes's cell_width must be > 0`);
  }
  if (sizeInfo.cell_height <= 0) {
    throw new Error(`Attributes's cell_height must be > 0`);
  }
  if (sizeInfo.piece_size <= 0) {
    throw new Error(`Attributes's piece_size must be > 0`);
  }
  if (types.isInteger(source)) {
    throw new Error(`Attributes expects a Plane as an argument`);
  }
  if (!source.data) {
    throw new Error(`invalid source, data is null`);
  }
  this.source = source;
  this.sizeInfo = sizeInfo;
  return this;
}

Attributes.prototype.ensureConsistentTileset = function(tiles, palette) {
  for (let j = 0; j < tiles.numTiles; j++) {
    let tile = tiles.get(j);

    // Get tile's color needs, pick a palette piece, then recolor
    let colorNeeds = this._getColorNeeds(tile, palette);
    let pieceNum = this._choosePalettePiece(colorNeeds, palette);
    if (pieceNum === null) {
      console.log(`[error] illegal tile, no palette: tileNum=${j}`);
      continue;
    }
    this._recolorTile(pieceNum, palette, tile);
  }
}

Attributes.prototype._getColorNeeds = function(tile, palette) {
  let needSet = {};
  for (let y = 0; y < tile.height; y++) {
    for (let x = 0; x < tile.width; x++) {
      // Look up the color index into colorSet
      let k = tile.pitch*y + x;
      let v = tile.data[k];
      let c = palette.lookup(v);
      needSet[c] = true;
    }
  }
  let needs = Object.keys(needSet);
  needs = needs.map(e => parseInt(e, 10));
  needs.sort(function(a, b) {
    return a - b;
  });
  return needs;
}

Attributes.prototype._choosePalettePiece = function(colorNeeds, palette) {
  let candidates = [];

  let pieceSize = this.sizeInfo.piece_size;
  // TODO: Handle non-even division
  let numOpt = palette.length / pieceSize;

  for (let n = 0; n < numOpt; n++) {
    let collect = [];
    for (let k = 0; k < pieceSize; k++) {
      let j = n*pieceSize + k;
      let pal = palette.get(j);
      collect.push(pal.cval);
    }

    // Does set contain the colorNeeds
    if (setContains(collect, colorNeeds)) {
      candidates.push(n);
    }
  }

  if (candidates.length >= 1) {
    if (candidates.length > 1) {
      // TODO: Do something more interesting here
      console.log(`[warning] ambiguous palette choice: ${colorNeeds} => ${candidates}`);
    }
    return candidates[0];
  }

  return null;
}

Attributes.prototype._recolorTile = function(pieceNum, palette, tile) {
  let pieceSize = this.sizeInfo.piece_size;
  // for each pixel
  for (let y = 0; y < tile.height; y++) {
    for (let x = 0; x < tile.width; x++) {
      // Look up the color
      let k = tile.pitch*y + x;
      let c = tile.data[k];
      // See what piece this pixel is using
      let choice = Math.floor(c / pieceSize);
      if (choice != pieceNum) {
        let badChoice = choice;
        // Change to the correct color
        // Must work because we got pieceNum
        tile.data[k] = palette.relocateColorTo(c, pieceNum, pieceSize)
      }
    }
  }
}

Attributes.prototype.realizeIndexedColor = function(c, x, y) {
  let cellX = Math.floor(x / this.sizeInfo.cell_width);
  let cellY = Math.floor(y / this.sizeInfo.cell_height);
  let pieceSize = this.sizeInfo.piece_size;
  let k = cellY * this.source.pitch + cellX;
  let choice = this.source.data[k];
  return (c % pieceSize) + (choice * pieceSize);
}

function setContains(container, want) {
  return want.every(function(e) { return container.indexOf(e) >= 0; });
}

module.exports.Attributes = Attributes;
