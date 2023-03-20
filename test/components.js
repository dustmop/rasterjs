var assert = require('assert');
var ra = require('../src/lib.js');

describe('Components', function() {

  it('field', function() {
    ra.resetState();
    let f = new ra.Field();
    assert.equal(f.kind(), 'field');
  });

  it('palette', function() {
    ra.resetState();
    // number of palette entries
    let pal = ra.usePalette({numEntries: 5});
    assert.equal(pal.constructor.name, 'Palette');
    assert.equal(pal.length, 5);
    assert.equal(pal.kind(), 'palette');
    // color values
    pal = ra.usePalette({entries: [12,23,34]});
    assert.equal(pal.constructor.name, 'Palette');
    assert.equal(pal.length, 3);
  });

  it('tiles', function() {
    ra.resetState();
    let detail = {tile_width: 8, tile_height: 8};
    // error, null constructor does not exist
    assert.throws(() => {
      // TODO: Tileset without arguments should convert the primary field
      let tiles = ra.useTileset();
    }, /useTileset expects an argument/);
    // number of tiles
    let tiles = ra.useTileset(5, detail);
    assert.equal(tiles.constructor.name, 'Tileset');
    assert.equal(tiles.length, 5);
    assert.equal(tiles.kind(), 'tileset');
    // error, field needs size
    assert.throws(() => {
      let pl = new ra.Field();
      tiles = ra.useTileset(pl, detail);
    }, /Tileset's tile_height is larger than source data/);
    // field
    let pl = new ra.Field();
    pl.setSize(16, 16);
    pl.drawCircle(3, 5, 7);
    tiles = ra.useTileset(pl, detail);
    assert.equal(tiles.constructor.name, 'Tileset');
    assert.equal(tiles.length, 4);
    // tileset object
    let ts = new ra.Tileset({num: 6, tile_width: 8, tile_height: 8});
    tiles = ra.useTileset(ts);
    assert.equal(tiles.constructor.name, 'Tileset');
    assert.equal(tiles.length, 6);
    // TODO: Multiple tilesets for bank-switching
  });

  it('colorspace', function() {
    ra.resetState();
    let detail = {cell_width: 8, cell_height: 8, piece_size: 6};
    // error, null constructor does not exist
    assert.throws(() => {
      let tiles = ra.useColorspace();
    }, /Colorspace expects an argument/);
    // error, number of cells
    assert.throws(() => {
      let tiles = ra.useColorspace(5, detail);
    }, /Colorspace expects a Field as an argument/);
    // field
    let pl = new ra.Field();
    pl.setSize(2);
    pl.fillPattern([[0,1], [2,1]])
    let colors = ra.useColorspace(pl, detail);
    assert.equal(colors.constructor.name, 'Colorspace');
    assert.equal(colors.kind(), 'colorspace');
  });

  // TODO: fields
  // TODO: interrupts

});
