const serializer = require('./serializer.js');
const types = require('./types.js');


class Attributes {
  constructor(source, sizeInfo) {
    // TOOD: cell_width, cell_height -> cell_dim
    // TODO: indexed or container
    // sizeInfo looks like:
    // {
    //   cell_width:  8,
    //   cell_height: 8,
    //   piece_size:  4, // num of colors in palette piece
    // }
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
      source.ensureReady();
    }
    this.source = source;
    this.sizeInfo = sizeInfo;
    return this;
  }

  ensureConsistentTileset(tiles, palette) {
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

  ensureConsistentPlanePalette(plane, palette) {
    let num_cell_x = plane.width  / this.sizeInfo.cell_width;
    let num_cell_y = plane.height / this.sizeInfo.cell_height;

    for (let i = 0; i < num_cell_y; i++) {
      for (let j = 0; j < num_cell_x; j++) {
        let pal_index_needs = this._collectColorNeeds(plane, j, i);
        let color_needs = this._lookupPaletteColors(pal_index_needs, palette);
        let was = this.source.get(j, i);
        let cell_value = this._discoverCellValue(color_needs, was, palette);
        this._downColorize(plane, j, i, this.sizeInfo.piece_size);
        this.source.put(j, i, cell_value);
      }
    }
  }

  _collectColorNeeds(plane, cell_x, cell_y) {
    let collect = {};
    for (let i = 0; i < this.sizeInfo.cell_height; i++) {
      for (let j = 0; j < this.sizeInfo.cell_width; j++) {
        let x = j + cell_x * this.sizeInfo.cell_width;
        let y = i + cell_y * this.sizeInfo.cell_height;
        collect[plane.get(x, y)] = true;
      }
    }
    let needs = Object.keys(collect);
    needs.sort((a,b) => a - b);
    return needs;
  }

  _lookupPaletteColors(pal_index_needs, palette) {
    let colors = [];
    for (let i = 0; i < pal_index_needs.length; i++) {
      colors.push(palette[pal_index_needs[i]].cval);
    }
    return colors;
  }

  _discoverCellValue(color_needs, was, palette) {
    let match = palette.findNearPieces(color_needs, this.sizeInfo.piece_size);
    if (match.winners.length) {
      // If the value of the cell matches a winner, keep using it.
      // Otherwise use the first winner.
      // TODO: Test me
      let pos = match.winners.indexOf(was);
      return match.winners[pos > -1 ? pos : 0];
    }
    // TODO: Test me
    return match.ranking[0].value;
  }

  _downColorize(plane, cell_x, cell_y, piece_size) {
    let collect = {};
    for (let i = 0; i < this.sizeInfo.cell_height; i++) {
      for (let j = 0; j < this.sizeInfo.cell_width; j++) {
        let x = j + cell_x * this.sizeInfo.cell_width;
        let y = i + cell_y * this.sizeInfo.cell_height;
        let v = plane.get(x, y);
        v = v % piece_size;
        plane.put(x, y, v);
      }
    }
  }

  _getColorNeeds(tile, palette) {
    let needSet = {};
    for (let y = 0; y < tile.height; y++) {
      for (let x = 0; x < tile.width; x++) {
        // Look up the color index into colorMap
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

  _choosePalettePiece(colorNeeds, palette) {
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

  _recolorTile(pieceNum, palette, tile) {
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

  realizeIndexedColor(c, x, y) {
    let cellX = Math.floor(x / this.sizeInfo.cell_width);
    let cellY = Math.floor(y / this.sizeInfo.cell_height);
    let pieceSize = this.sizeInfo.piece_size;
    let k = cellY * this.source.pitch + cellX;
    let choice = this.source.data[k];
    return (c % pieceSize) + (choice * pieceSize);
  }

  serialize() {
    let ser = new serializer.Serializer();
    return ser.attributesToSurface(this.source, this.sizeInfo);
  }

}

function setContains(container, want) {
  return want.every(function(e) { return container.indexOf(e) >= 0; });
}

module.exports.Attributes = Attributes;
