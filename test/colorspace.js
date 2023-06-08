var assert = require('assert');
var util = require('./util.js');
var ra = require('../src/lib.js');
var palette = require('../src/palette.js');
var colorspace = require('../src/colorspace.js');
var rgbColor = require('../src/rgb_color.js');

describe('Colorspace', function() {
  it('getRGBNeeds', () => {
    ra.resetState();

    let fruit = ra.loadImage('test/testdata/small-fruit.png');
    let pal = ra.palette;

    let source = new ra.Field();
    // TODO: make this unnecessary
    source.setSize(1, 1);
    let sizeInfo = {
      cell_width: 8,
      cell_height: 8,
    };
    let colors = new colorspace.Colorspace(source, sizeInfo);
    let actual = colors._getRGBNeeds(fruit, pal);
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
    let source = new ra.Field();
    let sizeInfo = {cell_width: 1, cell_height: 1};
    let colors = new colorspace.Colorspace(source, sizeInfo);

    // pick first
    let match = {
      winners: [3, 4],
      ranking: [
        {piece: 1, score: 2}
      ]
    };
    let piece = colors._choosePieceNum(match, null);
    assert.equal(piece, 3);

    // pick `was` if its a winner
    match = {
      winners: [3, 4],
      ranking: [
        {piece: 1, score: 2}
      ]
    };
    piece = colors._choosePieceNum(match, 4);
    assert.equal(piece, 4);

    // `was` is ignored if not a winner
    match = {
      winners: [3, 4],
      ranking: [
        {piece: 1, score: 2}
      ]
    };
    piece = colors._choosePieceNum(match, 2);
    assert.equal(piece, 3);

    // first in ranking if no winner
    match = {
      winners: [],
      ranking: [
        {piece: 1, score: 2}
      ]
    };
    piece = colors._choosePieceNum(match, null);
    assert.equal(piece, 1);

    // ranking doesn't care about `was`
    match = {
      winners: [],
      ranking: [
        {piece: 1, score: 2},
        {piece: 4, score: 1}
      ]
    };
    piece = colors._choosePieceNum(match, 4);
    assert.equal(piece, 1);
  });

  it('shrinkCellColor', () => {
    ra.resetState();
    ra.usePalette('pico8');

    let fruit = ra.loadImage('test/testdata/small-fruit.png');

    let source = new ra.Field();
    source.setSize(1, 1);
    let sizeInfo = {cell_width: 8, cell_height: 8};
    let colors = new colorspace.Colorspace(source, sizeInfo);
    colors._shrinkCellColor(fruit, 0, 0, 8, null);

    let expect = [
      [0, 0, 0, 0, 4, 0, 0, 0],
      [0, 0, 0, 0, 0, 4, 0, 0],
      [0, 2, 0, 0, 0, 4, 2, 0],
      [2, 0, 6, 0, 4, 0, 0, 2],
      [0, 6, 6, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0],
    ];
    assert.deepEqual(expect, fruit.toArrays());
  });

  it('normal', function() {
    ra.resetState();

    // palette has 22 values
    ra.usePalette({rgbmap:[
      0x000000, 0x565656, 0x664019, 0x858585, 0xa5a5a5, 0xc0c0c0,
      0xffffff, 0xffb973, 0xff7373, 0xff3333, 0xff9933, 0xf1ff73,
      0x2b6619, 0x4abf26, 0xbbffa6, 0x63ff33, 0xd9ffed, 0x2687bf,
      0x7033ff, 0x66194f, 0xffa6e4, 0xff33c2
    ]});

    // Create palette, 4 options, each of size 6
    let ents = [17,16,14,15,13,12,
                 0,11, 7,10, 9, 2,
                 6, 5, 4, 3, 1, 0,
                18,20, 8, 5,21,19,
               ];
    ra.palette.setEntries(ents);

    // Build colorspace
    let colors = new ra.Field();
    colors.setSize(4);
    colors.fillPattern([[0,1,1,1],
                        [1,3,3,3],
                        [2,2,1,0],
                        [1,3,0,0],
                       ]);
    ra.useColorspace(colors, {cell_width: 4, cell_height: 4, piece_size: 6});

    // Tileset / CHR
    let tiles = ra.loadImage('test/testdata/tiles.png');
    ra.useTileset(tiles, {tile_width: 4, tile_height: 4});

    // Pattern table / Nametable
    let field = new ra.Field();
    field.setSize(4);
    ra.useField(field);
    field.fillPattern([[2, 6, 1, 3],
                       [6, 7, 7, 7],
                       [5, 5, 1, 0],
                       [6, 4, 2, 2]]);

    util.renderCompareTo(ra, 'test/testdata/map_of_tiles.png');
  });

  it('table of values', function() {
    ra.resetState();

    // palette has 22 values
    ra.usePalette({rgbmap:[
      0x000000, 0x565656, 0x664019, 0x858585, 0xa5a5a5, 0xc0c0c0,
      0xffffff, 0xffb973, 0xff7373, 0xff3333, 0xff9933, 0xf1ff73,
      0x2b6619, 0x4abf26, 0xbbffa6, 0x63ff33, 0xd9ffed, 0x2687bf,
      0x7033ff, 0x66194f, 0xffa6e4, 0xff33c2
    ]});

    let ents = [17,16,14,15,13,12,
                 0,11, 7,10, 9, 2,
                 6, 5, 4, 3, 1, 0,
                18,20, 8, 5,21,19,
               ];
    ra.palette.setEntries(ents);

    // Build colorspace
    let colors = [
      [0, 1, 0, 1],
      [3, 2, 1, 3],
    ];
    ra.useColorspace(colors, {cell_width: 4, cell_height: 4, piece_size: 6});

    // use as an image
    let imageContent = ra.loadImage('test/testdata/tiles.png');
    ra.paste(imageContent);

    // TODO: fix this incorrect color that shows up
    util.renderCompareTo(ra, 'test/testdata/tiles-incorrect-color.png');
  });


  it('list of values', function() {
    ra.resetState();

    // palette has 22 values
    ra.usePalette({rgbmap:[
      0x000000, 0x565656, 0x664019, 0x858585, 0xa5a5a5, 0xc0c0c0,
      0xffffff, 0xffb973, 0xff7373, 0xff3333, 0xff9933, 0xf1ff73,
      0x2b6619, 0x4abf26, 0xbbffa6, 0x63ff33, 0xd9ffed, 0x2687bf,
      0x7033ff, 0x66194f, 0xffa6e4, 0xff33c2
    ]});

    // Build colorspace
    let colors = [
      [
        [17,16,14,15,13,12], // blue
        [ 0,11, 7,10, 9, 2], // red, orange, yellow
        [17,16,14,15,13,12], // blue
        [ 0,11, 7,10, 9, 2], // red, orange, yellow
      ],
      [
        [18,20, 8, 5,21,19], // purple, neon, orange, grey
        [ 6, 5, 4, 3, 1, 0], // white, grey, black
        [ 0,11, 7,10, 9, 2], // red, orange, yellow
        [18,20, 8, 5,21,19], // purple, neon, orange, grey
      ]
    ];
    ra.useColorspace(colors, {cell_width: 4, cell_height: 4, piece_size: 6});

    // use as an image
    let imageContent = ra.loadImage('test/testdata/tiles.png');
    ra.paste(imageContent);

    util.renderCompareTo(ra, 'test/testdata/tiles.png');
  });


  it('change', function() {
    ra.resetState();

    // palette has 22 values
    ra.usePalette({rgbmap:[
      0x000000, 0x565656, 0x664019, 0x858585, 0xa5a5a5, 0xc0c0c0,
      0xffffff, 0xffb973, 0xff7373, 0xff3333, 0xff9933, 0xf1ff73,
      0x2b6619, 0x4abf26, 0xbbffa6, 0x63ff33, 0xd9ffed, 0x2687bf,
      0x7033ff, 0x66194f, 0xffa6e4, 0xff33c2
    ]});

    // Create palette, 4 options, each of size 6
    let ents = [17,16,14,15,13,12, // blue through green
                 0,11, 7,10, 9, 2, // black, yellow, peach, orange, red, brown
                 6, 5, 4, 3, 1, 0, // greys - white to black
                18,20, 8, 5,21,19, // purple, pinks, grey(again), purple
               ];
    ra.usePalette({entries:ents});

    // Build colorspace
    let colors = new ra.Field();
    colors.setSize(4);
    ra.useColorspace(colors, {cell_width: 4, cell_height: 4, piece_size: 6});
    ra.colorspace.fillPattern([[0,1,1,1],
                               [1,3,3,3],
                               [2,2,1,0],
                               [1,3,0,0],
                              ]);

    // Tileset / CHR
    let tiles = ra.loadImage('test/testdata/tiles.png');
    ra.useTileset(tiles, {tile_width: 4, tile_height: 4});

    // Pattern table / Nametable
    let field = new ra.Field();
    field.setSize(4);
    ra.useField(field);
    field.fillPattern([[2, 6, 1, 3],
                       [6, 7, 7, 7],
                       [5, 5, 1, 0],
                       [6, 4, 2, 2]]);

    ra.colorspace.put(1, 0, 3);
    ra.colorspace.put(3, 0, 0);
    ra.colorspace.put(3, 1, 2);
    ra.colorspace.put(0, 2, 1);
    ra.colorspace.put(2, 2, 2);
    ra.colorspace.put(2, 3, 1);

    util.renderCompareTo(ra, 'test/testdata/colors_change.png');
  });

  it('without tiles', function() {
    ra.resetState();
    ra.usePalette('quick');

    ra.setSize(36, 36);
    ra.fillPattern([[0, 1, 1, 0],
                    [2, 0, 0, 2],
                    [3, 1, 2, 3],
                    [0, 1, 3, 3]]);

    let entries = [28, 36, 44, 52,
                   26, 34, 42, 50];
    ra.usePalette({entries:entries});

    let colors = new ra.Field();
    colors.setSize(6, 6);
    ra.useColorspace(colors, {cell_width: 6, cell_height: 6, piece_size: 4});

    // NOTE: colorspace should track this flag insead of the scene
    ra._hasRenderedOnce = true;

    ra.colorspace.fill(0);
    ra.colorspace.put(2, 0, 1);
    ra.colorspace.put(4, 3, 1);
    ra.colorspace.put(1, 5, 1);

    util.renderCompareTo(ra, 'test/testdata/colors_colorize.png');
  });

  it('getCellAtPixel', function() {
    ra.resetState();

    // Build colorspace
    let colors = new ra.Field();
    colors.setSize(4);
    colors.fillPattern([[0,1,1,1],
                        [1,3,3,3],
                        [2,2,1,0],
                        [1,3,0,0],
                      ]);
    ra.useColorspace(colors, {cell_width: 4, cell_height: 4, piece_size: 6});

    let actualCell = ra.colorspace.getCellAtPixel(3, 5);
    assert.deepEqual(actualCell, {cellX: 0, cellY: 1, pieceSize: 6, attr: 1});

    actualCell = ra.colorspace.getCellAtPixel(11, 7);
    assert.deepEqual(actualCell, {cellX: 2, cellY: 1, pieceSize: 6, attr: 3});
  });


  it('visualize', function() {
    let tmpdir = util.mkTmpDir();
    let tmpout = tmpdir + '/actual.png';
    ra.resetState();

    // Create palette, 4 options, each of size 6
    let ents = [17,16,14,15,13,12,
                 0,11, 7,10, 9, 2,
                 6, 5, 4, 3, 1, 0,
                18,20, 8, 5,21,19,
               ];
    ra.usePalette({entries:ents});

    // Build colorspace
    let dat = new ra.Field();
    dat.setSize(4);
    dat.fillPattern([[0,1,1,1],
                     [1,3,3,3],
                     [2,2,1,0],
                     [1,3,0,0],
                    ]);
    let colors = ra.useColorspace(dat, {cell_width: 4, cell_height: 4,
                                       piece_size: 6});

    let surfaces = colors.visualize();
    ra._saveSurfacesTo(surfaces, tmpout);
    util.ensureFilesMatch('test/testdata/colors_saved.png', tmpout);
  });

  // TODO: Test normalizePaletteColorspace will downcolor the field

  // TODO: Test that winner will keep previous value if it works

  // TODO: Test no winner, use ranking
});
