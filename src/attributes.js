function Attributes(source, sizeInfo) {
  if (!sizeInfo) {
    throw new Error(`Attributes requires a detail object parameter`);
  }
  if (!sizeInfo.block_width) {
    throw new Error(`invalid Attributes detail: missing block_width`);
  }
  if (!sizeInfo.block_height) {
    throw new Error(`invalid Attributes detail: missing block_height`);
  }
  if (!sizeInfo.option_size) {
    throw new Error(`invalid Attributes detail: missing option_size`);
  }
  if (!Math.trunc(sizeInfo.block_width) != 0) {
    throw new Error(`Attributes's block_width must be integer`);
  }
  if (!Math.trunc(sizeInfo.block_height) != 0) {
    throw new Error(`Attributes's block_height must be integer`);
  }
  if (!Math.trunc(sizeInfo.option_size) != 0) {
    throw new Error(`Attributes's option_size must be integer`);
  }
  if (sizeInfo.block_width <= 0) {
    throw new Error(`Attributes's block_width must be > 0`);
  }
  if (sizeInfo.block_height <= 0) {
    throw new Error(`Attributes's block_height must be > 0`);
  }
  if (sizeInfo.option_size <= 0) {
    throw new Error(`Attributes's option_size must be > 0`);
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
    let option = null;

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

  let optSize = this.sizeInfo.option_size;
  // TODO: Handle non-even division
  let numOpt = palette.length / optSize;

  for (let n = 0; n < numOpt; n++) {
    let collect = [];
    for (let k = 0; k < optSize; k++) {
      let j = n*optSize + k;
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
  let optSize = this.sizeInfo.option_size;
  // for each pixel
  for (let y = 0; y < tile.height; y++) {
    for (let x = 0; x < tile.width; x++) {
      // Look up the color
      let k = tile.pitch*y + x;
      let c = tile.data[k];
      // See what option this pixel is using
      let choice = Math.floor(c / optSize);
      if (choice != pieceNum) {
        let badChoice = choice;
        // Change to the correct color
        // Must work because we got pieceNum
        tile.data[k] = palette.relocateColorTo(c, pieceNum, optSize)
      }
    }
  }
}

Attributes.prototype.realizeIndexedColor = function(c, x, y) {
  let blockX = Math.floor(x / this.sizeInfo.block_width);
  let blockY = Math.floor(y / this.sizeInfo.block_height);
  let optSize = this.sizeInfo.option_size;
  let k = blockY * this.source.pitch + blockX;
  let choice = this.source.data[k];
  return (c % optSize) + (choice * optSize);
}

function setContains(container, want) {
  return want.every(function(e) { return container.indexOf(e) >= 0; });
}

module.exports.Attributes = Attributes;
