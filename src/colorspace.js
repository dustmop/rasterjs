const visualizer = require('./visualizer.js');
const types = require('./types.js');
const rgbColor = require('./rgb_color.js');


class Colorspace {
  // TODO: use arguments instead, optional arguments
  // Colorspace()
  // Colorspace(plane)
  // Colorspace(w, h)
  // Colorspace(palette)
  constructor(source, palette, sizeInfo) {
    // TOOD: cell_width, cell_height -> cell_dim
    // TODO: indexed or container
    // sizeInfo looks like:
    // {
    //   cell_width:  8,
    //   cell_height: 8,
    // }
    // TODO: source is a Plane, Colorspace can also own Grid of values
    if (!palette && !types.isPalette) {
      throw new Error(`palette must be null or a Palette`);
    }
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
    if (types.isInteger(source)) {
      throw new Error(`Colorspace expects a Plane as an argument`);
    }
    if (!source.data) {
      source.ensureReady();
    }
    this.source = source;
    this.sizeInfo = sizeInfo;
    return this;
  }

  ensureConsistentTileset(tiles, palette) {
    let pieceSize = this._getPieceSize();

    for (let j = 0; j < tiles.numTiles; j++) {
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

  ensureConsistentPlanePalette(plane, palette) {
    let num_cell_x = plane.width  / this.sizeInfo.cell_width;
    let num_cell_y = plane.height / this.sizeInfo.cell_height;

    let piece_size = this._getPieceSize();

    for (let i = 0; i < num_cell_y; i++) {
      for (let j = 0; j < num_cell_x; j++) {
        let pal_index_needs = this._collectColorNeeds(plane, j, i);
        let color_needs = this._lookupPaletteColors(pal_index_needs, palette);
        let was = this.source.get(j, i);
        let match = palette.findNearPieces(color_needs, piece_size);
        let cell_value = this._choosePieceNum(match, was);
        this._downModulate(plane, j, i, piece_size);
        this.source.put(j, i, cell_value);
      }
    }
  }

  _getPieceSize() {
    // TODO: cascade attribute palette spritelist colorMap (quick = 8)
    // TODO: order?
    if (this.sizeInfo.piece_size) {
      // TODO: test me
      return this.sizeInfo.piece_size;
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

  _downModulate(plane, cell_x, cell_y, piece_size) {
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
    let cellX = Math.floor(x / this.sizeInfo.cell_width);
    let cellY = Math.floor(y / this.sizeInfo.cell_height);
    let pieceSize = this.sizeInfo.piece_size;
    let k = cellY * this.source.pitch + cellX;
    let choice = this.source.data[k];
    return (c % pieceSize) + (choice * pieceSize);
  }

  visualize() {
    let viz = new visualizer.Visualizer();
    return viz.colorspaceToSurface(this.source, this.sizeInfo);
  }

}

function setContains(container, want) {
  return want.every(function(e) { return container.indexOf(e) >= 0; });
}

module.exports.Colorspace = Colorspace;
