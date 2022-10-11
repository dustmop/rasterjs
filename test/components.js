var assert = require('assert');
var ra = require('../src/lib.js');

describe('Components', function() {
  it('palette', function() {
    ra.resetState();
    // number of palette entries
    let pal = ra.usePalette({numEntries: 5});
    assert.equal(pal.constructor.name, 'Palette');
    assert.equal(pal.length, 5);
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
      // TODO: Tileset without arguments should convert the primary plane
      let tiles = ra.useTileset();
    }, /useTileset expects an argument/);
    // number of tiles
    let tiles = ra.useTileset(5, detail);
    assert.equal(tiles.constructor.name, 'Tileset');
    assert.equal(tiles.length, 5);
    // error, plane needs size
    assert.throws(() => {
      let pl = new ra.Plane();
      tiles = ra.useTileset(pl, detail);
    }, /Tileset's source has invalid size/);
    // plane
    let pl = new ra.Plane();
    pl.setSize(16, 16);
    tiles = ra.useTileset(pl, detail);
    assert.equal(tiles.constructor.name, 'Tileset');
    assert.equal(tiles.length, 4);
    // tileset object
    let ts = new ra.Tileset(6, detail);
    tiles = ra.useTileset(ts);
    assert.equal(tiles.constructor.name, 'Tileset');
    assert.equal(tiles.length, 6);
    // TODO: Multiple tilesets for bank-switching
  });

  it('attributes', function() {
    ra.resetState();
    let detail = {cell_width: 8, cell_height: 8, piece_size: 6};
    // error, null constructor does not exist
    assert.throws(() => {
      let tiles = ra.useAttributes();
    }, /Attributes expects an argument/);
    // error, number of cells
    assert.throws(() => {
      let tiles = ra.useAttributes(5, detail);
    }, /Attributes expects a Plane as an argument/);
    // plane
    let pl = new ra.Plane();
    pl.setSize(2);
    pl.fillPattern([[0,1], [2,1]])
    let attrs = ra.useAttributes(pl, detail);
    assert.equal(attrs.constructor.name, 'Attributes');
  });

  // TODO: planes
  // TODO: interrupts

});
