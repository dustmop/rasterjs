const component = require('./component.js');
const visualizer = require('./visualizer.js');
const types = require('./types.js');
const rgbColor = require('./rgb_color.js');


class Colorspace extends component.Component {
  // TODO: use arguments instead, optional arguments
  // Colorspace()
  // Colorspace(field)
  // Colorspace(array[array[int|array[int]]])
  constructor(source, sizeInfo) {
    super();

    // TOOD: cell_width, cell_height -> cell_dim
    // sizeInfo looks like:
    // {
    //   cell_width:  8,
    //   cell_height: 8,
    // }
    if (!source && !sizeInfo) {
      throw new Error(`Colorspace expects an argument`);
    }
    if (!sizeInfo) {
      throw new Error(`Colorspace requires a detail object parameter`);
    }
    if (!sizeInfo.cell_width) {
      throw new Error(`invalid Colorspace detail: missing cell_width`);
    }
    if (!sizeInfo.cell_height) {
      throw new Error(`invalid Colorspace detail: missing cell_height`);
    }
    if (!Math.trunc(sizeInfo.cell_width) != 0) {
      throw new Error(`Colorspace's cell_width must be integer`);
    }
    if (!Math.trunc(sizeInfo.cell_height) != 0) {
      throw new Error(`Colorspace's cell_height must be integer`);
    }
    if (sizeInfo.cell_width <= 0) {
      throw new Error(`Colorspace's cell_width must be > 0`);
    }
    if (sizeInfo.cell_height <= 0) {
      throw new Error(`Colorspace's cell_height must be > 0`);
    }

    if (types.isField(source)) {
      this.pitch = source.pitch;
      this._table = source.toArrays();
      this.width = source.width;
      this.height = source.height;
    } else if (types.isArray(source)) {
      let res = makeColorspaceContent(source);
      this.pitch = res.pitch;
      this._table = res.table;
      this.width = res.width;
      this.height = res.height;
    } else {
      throw new Error(`Colorspace expects a Field as an argument`);
    }

    this._sizeInfo = sizeInfo;
    return this;
  }

  kind() {
    return 'colorspace';
  }

  getCellAtPixel(pixelX, pixelY) {
    let pieceSize = this._sizeInfo.piece_size;
    let cellX = Math.floor(pixelX / this._sizeInfo.cell_width);
    let cellY = Math.floor(pixelY / this._sizeInfo.cell_height);
    let attr = this.get(cellX, cellY);
    return {
      cellX: cellX,
      cellY: cellY,
      pieceSize: pieceSize,
      attr: attr,
    };
  }

  get(x, y) {
    return this._table[y][x];
  }

  put(x, y, v) {
    this._table[y][x] = v;
  }

  fill(v) {
    if (!types.isNumber(v)) { throw new Error(`fill needs number`); }
    v = Math.floor(v);
    for (let y = 0; y < this.height; y++) {
      let row = this._table[y];
      for (let x = 0; x < row.length; x++) {
        row[x] = v;
      }
    }
  }

  fillPattern(args) {
    let row_size = null;
    for (let y = 0; y < args.length; y++) {
      let row = args[y];
      if (!row_size) {
        row_size = row.length;
      }
      for (let x = 0; x < row_size; x++) {
        this.put(x, y, row[x]);
      }
    }
  }

  ensureConsistentTileset(tiles, palette) {
    let pieceSize = this._getPieceSize();

    for (let j = 0; j < tiles.length; j++) {
      let tile = tiles.get(j);

      // Get tile's color needs, pick a palette piece, then recolor
      let rgbNeeds = this._getRGBNeeds(tile, palette);
      let match = palette.findNearPieces(rgbNeeds, pieceSize);
      let pieceNum = this._choosePieceNum(match, null);
      this._recolorTile(pieceNum, palette, tile, pieceSize);
    }
  }

  // given the result of findNearPieces, pick our favorite palette piece
  _choosePieceNum(match, was) {
    if (match.winners.length) {
      // If the value of the cell matches a winner, keep using it.
      if (was != null) {
        let pos = match.winners.indexOf(was);
        if (pos > -1) {
          return match.winners[pos];
        }
      }
      // Otherwise use the first winner.
      return match.winners[0];
    }
    // If there's no winner, pick best ranked, ignoring what the value
    // used to be.
    return match.ranking[0].piece;
  }

  ensureConsistentFieldPalette(field, palette) {
    let num_cell_x = field.width  / this._sizeInfo.cell_width;
    let num_cell_y = field.height / this._sizeInfo.cell_height;

    let piece_size = this._getPieceSize();

    for (let i = 0; i < num_cell_y; i++) {
      for (let j = 0; j < num_cell_x; j++) {
        let pal_index_needs = this._collectColorNeeds(field, j, i);
        let color_needs = this._lookupPaletteColors(pal_index_needs, palette);
        let cellValue = this.get(j, i);
        if (Array.isArray(cellValue)) {
          // cell has palette entries, index those instead of full bit color
          let entries = cellValue;
          this._shrinkCellColor(field, j, i, null, entries);
          continue;
        }
        let match = palette.findNearPieces(color_needs, piece_size);
        let cell_value = this._choosePieceNum(match, cellValue);
        this._shrinkCellColor(field, j, i, piece_size, null);
        // update colorspace value
        this.put(j, i, cell_value);
      }
    }
  }

  _getPieceSize() {
    // TODO: cascade attribute palette spritelist colorMap (quick = 8)
    // TODO: order?
    if (this._sizeInfo.piece_size) {
      // TODO: test me
      return this._sizeInfo.piece_size;
    } else if (this.palette && this.palette.size_info) {
      // TODO: test me
      return this.palette.size_info;
    } else {
      // TODO: assume colorMap is 'quick'
      // TODO: test me
      return 8;
      // TODO: spriteList
      // TODO: get a component map that we can iterate?
      // TODO: `partnerComponents` will update upon `useComponent` call
    }
  }

  _collectColorNeeds(field, cell_x, cell_y) {
    let collect = {};
    for (let i = 0; i < this._sizeInfo.cell_height; i++) {
      for (let j = 0; j < this._sizeInfo.cell_width; j++) {
        let x = j + cell_x * this._sizeInfo.cell_width;
        let y = i + cell_y * this._sizeInfo.cell_height;
        collect[field.get(x, y)] = true;
      }
    }
    let needs = Object.keys(collect);
    needs = needs.map(e => parseInt(e, 10));
    needs.sort((a,b) => a - b);
    return needs;
  }

  _lookupPaletteColors(pal_index_needs, palette) {
    let colors = [];
    for (let i = 0; i < pal_index_needs.length; i++) {
      colors.push(palette.entry(pal_index_needs[i]).rgb);
    }
    return colors;
  }

  _shrinkCellColor(field, cell_x, cell_y, piece_size, entries) {
    for (let i = 0; i < this._sizeInfo.cell_height; i++) {
      for (let j = 0; j < this._sizeInfo.cell_width; j++) {
        let x = j + cell_x * this._sizeInfo.cell_width;
        let y = i + cell_y * this._sizeInfo.cell_height;
        let v = field.get(x, y);
        if (piece_size) {
          v = v % piece_size;
          field.put(x, y, v);
          continue;
        }
        if (entries) {
          v = entries.indexOf(v);
          field.put(x, y, v != -1 ? v : 0);
          continue;
        }
      }
    }
  }

  _getRGBNeeds(tile, palette) {
    let needSet = {};
    for (let y = 0; y < tile.height; y++) {
      for (let x = 0; x < tile.width; x++) {
        // Look up the color index into colorMap
        let k = tile.pitch*y + x;
        let v = tile.data[k];
        let rgbint = palette.getRGB(v);
        needSet[rgbint] = true;
      }
    }
    let needs = Object.keys(needSet);
    needs = needs.map(e => parseInt(e, 10));
    needs.sort(function(a, b) {
      return a - b;
    });
    return needs.map(e => new rgbColor.RGBColor(e));
  }

  _recolorTile(pieceNum, palette, tile, piece_size) {
    // TODO: test me
    let pieceSize = piece_size;
    // for each pixel
    for (let y = 0; y < tile.height; y++) {
      for (let x = 0; x < tile.width; x++) {
        // look up the correct color
        let k = tile.pitch*y + x;
        let c = tile.data[k];
        tile.data[k] = palette.relocateColorTo(c, pieceNum, pieceSize)
      }
    }
  }

  realizeIndexedColor(c, x, y) {
    let cellX = Math.floor(x / this._sizeInfo.cell_width);
    let cellY = Math.floor(y / this._sizeInfo.cell_height);
    let pieceSize = this._sizeInfo.piece_size;
    let choice = this.get(cellX, cellY);
    return (c % pieceSize) + (choice * pieceSize);
  }

  visualize() {
    let viz = new visualizer.Visualizer();
    return viz.colorspaceToSurface(this, this._sizeInfo);
  }

}

function setContains(container, want) {
  return want.every(function(e) { return container.indexOf(e) >= 0; });
}

function makeColorspaceContent(source) {
  types.ensureType(source, 'Array');
  let minWidth, maxWidth;
  let height = source.length;
  for (let y = 0; y < height; y++) {
    let row = source[y];
    types.ensureType(row, 'Array');
    if (minWidth == null || row.length < minWidth) {
      minWidth = row.length;
    }
    if (maxWidth == null || row.length > maxWidth) {
      maxWidth = row.length;
    }
    for (let x = 0; x < row.length; x++) {
      let elem = row[x];
      if (!types.isNumber(elem) && !types.isNumArray(elem)) {
        throw new Error(`colorspace must be 2d grid of nums or lists of nums`);
      }
    }
  }

  // fill the data
  let width = minWidth;
  let pitch = maxWidth;
  let data = new Array(height);
  for (let y = 0; y < height; y++) {
    let row = new Array(pitch);
    for (let j = 0; j < pitch; j++) {
      let elem = source[y][j];
      if (types.isArray(elem)) {
        elem = elem.slice();
      }
      row[j] = elem;
    }
    data[y] = row;
  }
  return {table: data, width: width, height: height, pitch: pitch};
}

module.exports.Colorspace = Colorspace;
