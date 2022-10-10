var assert = require('assert');
var util = require('./util.js');
var ra = require('../src/lib.js');
var palette = require('../src/palette.js');
var attributes = require('../src/attributes.js');
var rgbColor = require('../src/rgb_color.js');

describe('Attributes', function() {
  it('getRGBNeeds', () => {
    ra.resetState();

    let fruit = ra.loadImage('test/testdata/small-fruit.png');
    let pal = ra.palette;

    // using this breaks things!
    //let pal = new palette.Palette();

    let source = new ra.Plane();
    // TODO: make this unnecessary
    source.setSize(1, 1);
    let sizeInfo = {
      cell_width: 8,
      cell_height: 8,
    };
    let attrs = new attributes.Attributes(source, pal, sizeInfo);
    let actual = attrs._getRGBNeeds(fruit, pal);
    let expect = [
      new rgbColor.RGBColor(0x000000),
      new rgbColor.RGBColor(0x7e2553),
      new rgbColor.RGBColor(0xab5236),
      new rgbColor.RGBColor(0xff004d),
      new rgbColor.RGBColor(0xff77a8),
    ]
    assert.deepEqual(actual, expect);
  });

  it('choosePieceNum', () => {
    let source = new ra.Plane();
    let pal = new palette.Palette();
    let sizeInfo = {cell_width: 1, cell_height: 1};
    let attrs = new attributes.Attributes(source, pal, sizeInfo);

    // pick first
    let match = {
      winners: [3, 4],
      ranking: [
        {piece: 1, score: 2}
      ]
    };
    let piece = attrs._choosePieceNum(match, null);
    assert.equal(piece, 3);

    // pick `was` if its a winner
    match = {
      winners: [3, 4],
      ranking: [
        {piece: 1, score: 2}
      ]
    };
    piece = attrs._choosePieceNum(match, 4);
    assert.equal(piece, 4);

    // `was` is ignored if not a winner
    match = {
      winners: [3, 4],
      ranking: [
        {piece: 1, score: 2}
      ]
    };
    piece = attrs._choosePieceNum(match, 2);
    assert.equal(piece, 3);

    // first in ranking if no winner
    match = {
      winners: [],
      ranking: [
        {piece: 1, score: 2}
      ]
    };
    piece = attrs._choosePieceNum(match, null);
    assert.equal(piece, 1);

    // ranking doesn't care about `was`
    match = {
      winners: [],
      ranking: [
        {piece: 1, score: 2},
        {piece: 4, score: 1}
      ]
    };
    piece = attrs._choosePieceNum(match, 4);
    assert.equal(piece, 1);
  });

  it('downModulate', () => {
    ra.resetState();
    ra.useColors('pico8');

    let fruit = ra.loadImage('test/testdata/small-fruit.png');
    let pal = ra.palette;

    let source = new ra.Plane();
    source.setSize(1, 1);
    let sizeInfo = {cell_width: 8, cell_height: 8};
    let attrs = new attributes.Attributes(source, pal, sizeInfo);
    attrs._downModulate(fruit, 0, 0, 8);

    let expect = new Uint8Array([
      0, 0, 0, 0, 4, 0, 0, 0,
      0, 0, 0, 0, 0, 4, 0, 0,
      0, 2, 0, 0, 0, 4, 2, 0,
      2, 0, 6, 0, 4, 0, 0, 2,
      0, 6, 6, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0
    ]);
    assert.deepEqual(expect, fruit.clone().data);
  });

  it('normal', function() {
    ra.resetState();

    // ColorMap has 22 values
    ra.useColors([
      0x000000, 0x565656, 0x664019, 0x858585, 0xa5a5a5, 0xc0c0c0,
      0xffffff, 0xffb973, 0xff7373, 0xff3333, 0xff9933, 0xf1ff73,
      0x2b6619, 0x4abf26, 0xbbffa6, 0x63ff33, 0xd9ffed, 0x2687bf,
      0x7033ff, 0x66194f, 0xffa6e4, 0xff33c2
    ]);

    // Create palette, 4 options, each of size 6
    let pal = [17,16,14,15,13,12,
                0,11, 7,10, 9, 2,
                6, 5, 4, 3, 1, 0,
               18,20, 8, 5,21,19,
              ];
    ra.usePalette(pal);

    // Build attributes
    let attrs = new ra.Plane();
    attrs.setSize(4);
    attrs.fillPattern([[0,1,1,1],
                       [1,3,3,3],
                       [2,2,1,0],
                       [1,3,0,0],
                      ]);
    ra.useAttributes(attrs, {cell_width: 4, cell_height: 4, piece_size: 6});

    // Tileset / CHR
    let tiles = ra.loadImage('test/testdata/tiles.png');
    ra.useTileset(tiles, {tile_width: 4, tile_height: 4});

    // Pattern table / Nametable
    let plane = new ra.Plane();
    plane.setSize(4);
    ra.usePlane(plane);
    plane.fillPattern([[2, 6, 1, 3],
                       [6, 7, 7, 7],
                       [5, 5, 1, 0],
                       [6, 4, 2, 2]]);

    util.renderCompareTo(ra, 'test/testdata/map_of_tiles.png');
  });


  it('change', function() {
    ra.resetState();

    // ColorMap has 22 values
    ra.useColors([
      0x000000, 0x565656, 0x664019, 0x858585, 0xa5a5a5, 0xc0c0c0,
      0xffffff, 0xffb973, 0xff7373, 0xff3333, 0xff9933, 0xf1ff73,
      0x2b6619, 0x4abf26, 0xbbffa6, 0x63ff33, 0xd9ffed, 0x2687bf,
      0x7033ff, 0x66194f, 0xffa6e4, 0xff33c2
    ]);

    // Create palette, 4 options, each of size 6
    let pal = [17,16,14,15,13,12, // blue through green
                0,11, 7,10, 9, 2, // black, yellow, peach, orange, red, brown
                6, 5, 4, 3, 1, 0, // greys - white to black
               18,20, 8, 5,21,19, // purple, pinks, grey(again), purple
              ];
    ra.usePalette(pal);

    // Build attributes
    let attrs = new ra.Plane();
    attrs.setSize(4);
    attrs.fillPattern([[0,1,1,1],
                       [1,3,3,3],
                       [2,2,1,0],
                       [1,3,0,0],
                      ]);
    ra.useAttributes(attrs, {cell_width: 4, cell_height: 4, piece_size: 6});

    // Tileset / CHR
    let tiles = ra.loadImage('test/testdata/tiles.png');
    ra.useTileset(tiles, {tile_width: 4, tile_height: 4});

    // Pattern table / Nametable
    let plane = new ra.Plane();
    plane.setSize(4);
    ra.usePlane(plane);
    plane.fillPattern([[2, 6, 1, 3],
                       [6, 7, 7, 7],
                       [5, 5, 1, 0],
                       [6, 4, 2, 2]]);

    attrs.put(1, 0, 3);
    attrs.put(3, 0, 0);
    attrs.put(3, 1, 2);
    attrs.put(0, 2, 1);
    attrs.put(2, 2, 2);
    attrs.put(2, 3, 1);

    util.renderCompareTo(ra, 'test/testdata/attr_change.png');
  });

  it('without tiles', function() {
    ra.resetState();
    ra.useColors('quick');

    ra.setSize(36, 36);
    ra.fillPattern([[0, 1, 1, 0],
                    [2, 0, 0, 2],
                    [3, 1, 2, 3],
                    [0, 1, 3, 3]]);

    let palette = [28, 36, 44, 52,
                   26, 34, 42, 50];
    ra.usePalette(palette);

    let attrs = new ra.Plane();
    attrs.setSize(6, 6);
    attrs.fill(0);
    attrs.put(2, 0, 1);
    attrs.put(4, 3, 1);
    attrs.put(1, 5, 1);
    ra.useAttributes(attrs, {cell_width: 6, cell_height: 6, piece_size: 4});

    util.renderCompareTo(ra, 'test/testdata/attrs_colorize.png');
  });

  it('serialize', function() {
    let tmpdir = util.mkTmpDir();
    let tmpout = tmpdir + '/actual.png';
    ra.resetState();

    // Create palette, 4 options, each of size 6
    let pal = [17,16,14,15,13,12,
                0,11, 7,10, 9, 2,
                6, 5, 4, 3, 1, 0,
               18,20, 8, 5,21,19,
              ];
    ra.usePalette(pal);

    // Build attributes
    let dat = new ra.Plane();
    dat.setSize(4);
    dat.fillPattern([[0,1,1,1],
                     [1,3,3,3],
                     [2,2,1,0],
                     [1,3,0,0],
                    ]);
    let attrs = ra.useAttributes(dat, {cell_width: 4, cell_height: 4,
                                       piece_size: 6});

    let surfaces = attrs.serialize();
    ra._saveSurfacesTo(surfaces, tmpout);
    util.ensureFilesMatch('test/testdata/attrs_saved.png', tmpout);
  });

  // TODO: Test normalizePaletteAttributes will downcolor the plane

  // TODO: Test that winner will keep previous value if it works

  // TODO: Test no winner, use ranking
});
