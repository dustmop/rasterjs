var assert = require('assert');
var util = require('./util.js');
var ra = require('../src/lib.js');

describe('Tileset', function() {
  it('tiles from image', function() {
    ra.resetState();
    ra.setSize(6, 6, {planeOnly: true});

    let tiles = ra.loadImage('test/testdata/tiles.png');
    ra.useTileset(tiles, {tile_width: 4, tile_height: 4});

    ra.fillPattern([[2, 6, 1, 3],
                    [6, 7, 7, 7],
                    [5, 5, 1, 0],
                    [6, 4, 2, 2]]);

    util.renderCompareTo(ra, 'test/testdata/map_image.png');
  });

  it('tiles with separate plane', function() {
    ra.resetState();

    let plane = new ra.Plane();
    plane.setSize(4);

    let tiles = ra.loadImage('test/testdata/tiles.png');
    ra.useTileset(tiles, {tile_width: 4, tile_height: 4});
    ra.usePlane(plane);

    plane.fillPattern([[2, 6, 1, 3],
                       [6, 7, 7, 7],
                       [5, 5, 1, 0],
                       [6, 4, 2, 2]]);

    util.renderCompareTo(ra, 'test/testdata/map_of_tiles.png');
  });

  it('draw tiles', function() {
    ra.resetState();

    let plane = new ra.Plane();
    plane.setSize(4);

    let tiles = new ra.Plane();
    tiles.setSize(16);

    tiles.setColor(34);
    tiles.drawDot(0, 0);
    tiles.drawDot(8, 1);
    tiles.drawDot(8, 2);
    tiles.drawDot(9, 1);
    tiles.drawDot(9, 2);
    tiles.drawDot(1,  9);
    tiles.drawDot(2, 10);
    tiles.drawDot(3, 11);
    tiles.drawDot(4, 12);
    tiles.drawDot(5, 13);

    ra.useTileset(tiles, {tile_width: 8, tile_height: 8});
    ra.usePlane(plane);

    plane.fillPattern([[ 0, 0, 1, 0],
                       [ 0, 1, 0, 0],
                       [ 0, 0, 1, 2],
                       [ 0, 0, 0, 0],
                      ]);

    util.renderCompareTo(ra, 'test/testdata/drawn_tiles.png');

    tiles.drawDot(2, 0);
    tiles.drawDot(0, 2);
    tiles.drawDot(2, 2);
    util.renderCompareTo(ra, 'test/testdata/modify_tiles.png');
  });

  it('draw using tileset', function() {
    ra.resetState();

    let plane = new ra.Plane();
    plane.setSize(4);

    let tileset = new ra.Tileset(4, {tile_width: 8, tile_height: 8});

    let t = tileset.get(0);
    t.put(0, 0, 34);

    t = tileset.get(1);
    t.put(0, 1, 34);
    t.put(0, 2, 34);
    t.put(1, 1, 34);
    t.put(1, 2, 34);

    t = tileset.get(2);
    t.put(1, 1, 34);
    t.put(2, 2, 34);
    t.put(3, 3, 34);
    t.put(4, 4, 34);
    t.put(5, 5, 34);

    ra.useTileset(tileset);
    ra.usePlane(plane);

    plane.fillPattern([[ 0, 0, 1, 0],
                       [ 0, 1, 0, 0],
                       [ 0, 0, 1, 2],
                       [ 0, 0, 0, 0],
                      ]);

    util.renderCompareTo(ra, 'test/testdata/drawn_tiles.png');

    t = tileset.get(0);
    t.put(2, 0, 34);
    t.put(0, 2, 34);
    t.put(2, 2, 34);
    util.renderCompareTo(ra, 'test/testdata/modify_tiles.png');
  });


  it('tiles with palette', function() {
    ra.resetState();

    let plane = new ra.Plane();
    plane.setSize(4);

    let tiles = new ra.Plane();
    tiles.setSize(16);

    // tile 0
    tiles.setColor(1);
    tiles.drawDot(0, 0);
    tiles.drawDot(4, 4);
    // tile 1
    tiles.setColor(2);
    tiles.drawDot(10, 2);
    tiles.drawDot(10, 3);
    // tile 2
    tiles.setColor(3);
    tiles.drawDot(4, 12);
    tiles.setColor(4);
    tiles.drawDot(5, 13);

    //              0   1   2   3   4
    ra.usePalette([ 4, 31, 37, 34, 31]);

    ra.useTileset(tiles, {tile_width: 8, tile_height: 8});
    ra.usePlane(plane);

    plane.fillPattern([[ 0, 1, 2, 0],
                       [ 0, 1, 0, 2],
                       [ 1, 3, 1, 2],
                       [ 2, 2, 0, 0],
                      ]);

    util.renderCompareTo(ra, 'test/testdata/palette_tiles.png');
  });

  it('missing dimension', function() {
    ra.resetState();

    let plane = new ra.Plane();
    plane.setSize(4);

    let tiles = ra.loadImage('test/testdata/tiles.png');
    assert.throws(function() {
      ra.useTileset(tiles, {tile_height: 8});
    }, /Error: invalid Tileset detail: missing tile_width/);
  });

  it('invalid dimension', function() {
    ra.resetState();

    let plane = new ra.Plane();
    plane.setSize(4);

    let tiles = ra.loadImage('test/testdata/tiles.png');
    assert.throws(function() {
      ra.useTileset(tiles, {tile_width: 4, tile_height: 10});
    }, /Error: Tileset's tile_height is larger than source data/);
  });

  it('bad tile number', function() {
    ra.resetState();

    let plane = new ra.Plane();
    plane.setSize(4);

    let tiles = ra.loadImage('test/testdata/tiles.png');
    ra.useTileset(tiles, {tile_width: 4, tile_height: 4});
    ra.usePlane(plane);

    plane.fillPattern([[2, 6, 1, 3],
                       [6, 7,15, 7],
                       [5, 5, 1, 0],
                       [6, 4, 2, 2]]);

    assert.throws(function() {
      ra.renderPrimaryPlane();
    }, /Error: invalid tile number 15 at 2,1/);
  });

  it('tiles with attributes', function() {
    ra.resetState();

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

  it('tiles then change attributes', function() {
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

    attrs.put(1, 0, 3);
    attrs.put(3, 0, 0);
    attrs.put(3, 1, 2);
    attrs.put(0, 2, 1);
    attrs.put(2, 2, 2);
    attrs.put(2, 3, 1);

    util.renderCompareTo(ra, 'test/testdata/attr_change.png');
  });

  it('attributes save', function() {
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

  it('tiles save', function() {
    let tmpdir = util.mkTmpDir();
    let tmpout = tmpdir + '/actual.png';
    ra.resetState();

    let tiles = ra.loadImage('test/testdata/tiles.png');
    let tileset = ra.useTileset(tiles, {tile_width: 4, tile_height: 4});

    let surfaces = tileset.serialize();

    ra._saveSurfacesTo(surfaces, tmpout);

    util.ensureFilesMatch('test/testdata/tiles_saved.png', tmpout);
  });

  it('build from plane', function() {
    let tmpdir = util.mkTmpDir();
    let tmpout = tmpdir + '/actual.png';
    ra.resetState();

    let img = ra.loadImage('test/testdata/map_of_tiles.png');
    ra.drawImage(img);

    let tiles = ra.useTileset({tile_width: 4, tile_height: 4});
    assert.equal(tiles.length, 8);
    assert.equal(tiles.numTiles, 8);

    let pattern = ra.clonePlane();
    let expect = new Uint8Array([
      0, 1, 2, 3,
      1, 4, 4, 4,
      5, 5, 2, 6,
      1, 7, 0, 0,
    ]);
    assert.deepEqual(expect, pattern.data);
    assert.deepEqual(4, pattern.width);
    assert.deepEqual(4, pattern.height);
  });

  it('cant construct from string', function() {
    assert.throws(function() {
      ra.useTileset('abc', {tile_width: 4, tile_height: 4});
    }, /cannot construct tileset from abc/);
  });

});
