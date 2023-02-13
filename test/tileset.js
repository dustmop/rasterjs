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

    let tilePlane = new ra.Plane();
    tilePlane.setSize(16, 16);

    let tiles = ra.useTileset(tilePlane, {tile_width: 8, tile_height: 8});
    ra.usePlane(plane);

    let modTile = tiles.get(0);
    modTile.put(0, 0, 34);

    modTile = tiles.get(1);
    modTile.put(0, 1, 34);
    modTile.put(0, 2, 34);
    modTile.put(1, 1, 34);
    modTile.put(1, 2, 34);

    modTile = tiles.get(2);
    modTile.put(1, 1, 34);
    modTile.put(2, 2, 34);
    modTile.put(3, 3, 34);
    modTile.put(4, 4, 34);
    modTile.put(5, 5, 34);

    plane.fillPattern([[ 0, 0, 1, 0],
                       [ 0, 1, 0, 0],
                       [ 0, 0, 1, 2],
                       [ 0, 0, 0, 0],
                      ]);

    util.renderCompareTo(ra, 'test/testdata/drawn_tiles.png');

    modTile = tiles.get(0);
    modTile.put(2, 0, 34);
    modTile.put(0, 2, 34);
    modTile.put(2, 2, 34);
    util.renderCompareTo(ra, 'test/testdata/modify_tiles.png');
  });

  it('draw using tileset', function() {
    ra.resetState();

    let plane = new ra.Plane();
    plane.setSize(4);

    let tileset = new ra.Tileset({num: 4, tile_width: 8, tile_height: 8});

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

    //                       0   1   2   3   4
    ra.usePalette({entries:[ 4, 31, 37, 34, 31]});

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

    util.renderCompareTo(ra, 'test/testdata/tile_overflow.png');
  });

  it('tiles with attributes', function() {
    ra.resetState();

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
    ra.usePalette({entries:ents});

    // Build colorspace
    let colors = new ra.Plane();
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
    let plane = new ra.Plane();
    plane.setSize(4);
    ra.usePlane(plane);
    plane.fillPattern([[2, 6, 1, 3],
                       [6, 7, 7, 7],
                       [5, 5, 1, 0],
                       [6, 4, 2, 2]]);

    util.renderCompareTo(ra, 'test/testdata/map_of_tiles.png');
  });

  it('tiles then change colorspaces', function() {
    ra.resetState();

    // ColorMap has 22 values
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
    ra.usePalette({entries:ents});

    // Build colorspace
    let colors = new ra.Plane();
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
    let plane = new ra.Plane();
    plane.setSize(4);
    ra.usePlane(plane);
    plane.fillPattern([[2, 6, 1, 3],
                       [6, 7, 7, 7],
                       [5, 5, 1, 0],
                       [6, 4, 2, 2]]);

    colors.put(1, 0, 3);
    colors.put(3, 0, 0);
    colors.put(3, 1, 2);
    colors.put(0, 2, 1);
    colors.put(2, 2, 2);
    colors.put(2, 3, 1);

    util.renderCompareTo(ra, 'test/testdata/colors_change.png');
  });

  it('attributes save', function() {
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

    // Build attributes
    let dat = new ra.Plane();
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

  it('visualize', function() {
    let tmpdir = util.mkTmpDir();
    let tmpout = tmpdir + '/actual.png';
    ra.resetState();

    let tiles = ra.loadImage('test/testdata/tiles.png');
    let tileset = ra.useTileset(tiles, {tile_width: 4, tile_height: 4});

    let surfaces = tileset.visualize({palette: ra.palette});
    ra._saveSurfacesTo(surfaces, tmpout);
    util.ensureFilesMatch('test/testdata/tiles_saved.png', tmpout);

    surfaces = tileset.visualize({palette: ra.palette, numTileX: 4});
    ra._saveSurfacesTo(surfaces, tmpout);
    util.ensureFilesMatch('test/testdata/tiles_saved_4wide.png', tmpout);
  });

  it('build from plane', function() {
    let tmpdir = util.mkTmpDir();
    let tmpout = tmpdir + '/actual.png';
    ra.resetState();

    let img = ra.loadImage('test/testdata/map_of_tiles.png');
    ra.paste(img);

    let tiles = ra.useTileset({tile_width: 4, tile_height: 4});
    assert.equal(tiles.length, 8);
    assert.equal(tiles.numTiles, 8);

    let pattern = ra.plane.pack();
    let expect = new Uint8Array([
      0, 1, 2, 3,
      1, 4, 4, 4,
      5, 5, 2, 6,
      1, 7, 0, 0,
    ]);
    assert.deepEqual(expect, pattern);
    assert.deepEqual(4, ra.plane.width);
    assert.deepEqual(4, ra.plane.height);
  });

  it('cant construct from string', function() {
    assert.throws(function() {
      ra.useTileset('abc', {tile_width: 4, tile_height: 4});
    }, /cannot construct tileset from abc/);
  });

  it('tiles addFrom', function() {
    ra.resetState();
    ra.setSize(3, 3, {planeOnly: true});

    let firstSet = ra.loadImage('test/testdata/tiles.png');
    let secondSet = ra.loadImage('test/testdata/dark_sphere_with_bg.png');

    let tiles = new ra.Tileset({tile_width: 8, tile_height: 8});
    tiles.addFrom(firstSet);
    tiles.addFrom(secondSet);
    ra.useTileset(tiles);

    ra.fillPattern([[1, 1, 2],
                    [0, 4, 0],
                    [3, 6, 1]]);
    util.renderCompareTo(ra, 'test/testdata/compose_tiles.png');

    let obj = tiles.serialize();
    let expectSer = '{"tileWidth":8,"tileHeight":8,"data":[[0,0,0,0,1,1,1,1,0,2,2,0,1,1,6,1,0,2,2,0,1,6,8,1,0,0,0,0,1,1,1,1,11,11,11,11,12,12,13,13,11,16,16,11,12,17,18,13,11,19,19,11,12,20,20,4,11,16,16,11,12,4,4,4],[2,2,3,2,4,5,5,4,7,2,3,7,5,5,5,5,7,9,3,7,5,5,5,5,10,10,10,10,4,5,5,4,14,14,14,5,15,15,15,15,5,6,5,14,16,16,16,16,6,5,6,14,21,21,21,21,14,14,14,6,12,12,12,12],[22,22,22,22,22,22,4,4,22,22,22,22,4,4,23,23,22,22,22,4,25,23,23,23,22,22,4,24,25,23,23,23,22,4,24,25,23,23,26,27,22,4,24,25,23,23,27,26,4,24,25,25,23,23,23,27,4,24,25,25,23,23,23,23],[4,4,22,22,22,22,22,22,23,24,4,4,22,22,22,22,23,23,23,24,4,22,22,22,23,23,23,23,25,4,22,22,23,23,23,23,23,25,4,22,27,23,23,23,23,23,4,22,23,23,23,23,23,23,25,4,23,23,23,23,23,23,23,4],[4,24,24,25,23,23,23,23,4,24,24,25,25,23,23,23,22,4,24,24,25,25,23,23,22,4,24,24,24,25,25,25,22,22,4,24,24,24,25,25,22,22,22,4,24,24,24,24,22,22,22,22,4,4,24,24,22,22,22,22,22,22,4,4],[23,23,23,23,23,23,25,4,23,23,23,23,23,23,25,4,23,23,23,23,25,25,4,22,23,23,25,25,25,24,4,22,25,25,25,24,24,4,22,22,24,24,24,24,4,22,22,22,24,24,4,4,22,22,22,22,4,4,22,22,22,22,22,22]]}';
    assert.deepEqual(obj, expectSer);
  });

  it('tileset methods', ()=>{
    let tiles = new ra.Tileset({tile_width: 8, tile_height: 8});
    assert(tiles.isEmpty());
    assert.equal(tiles.length, 0);

    // add an empty tile
    tiles.add(tiles.newTile());
    assert(!tiles.isEmpty());
    assert.equal(tiles.length, 1);

    // duplicate tile is ignored
    tiles.add(tiles.newTile());
    assert.equal(tiles.length, 1);

    // push will add a dup
    tiles.push(tiles.newTile());
    assert.equal(tiles.length, 2);

    // so will add with allowDups==true
    tiles.add(tiles.newTile(), true);
    assert.equal(tiles.length, 3);

    tiles.clear();
    assert(tiles.isEmpty());
    assert.equal(tiles.length, 0);
  });

  it('tileset insertFrom and pattern table', ()=>{
    let tiles = new ra.Tileset({tile_width: 4, tile_height: 4});
    assert(tiles.isEmpty());
    assert.equal(tiles.length, 0);

    let image = ra.loadImage('test/testdata/tiles.png');
    let more = new ra.Tileset({tile_width: 4, tile_height: 4});
    let pattern = more.addFrom(image);

    // serialize the pattern table
    let obj = pattern.serialize();
    let expectSer = '{"width":4,"height":2,"data":[0,1,2,3,4,5,6,7]}';
    assert.deepEqual(obj, expectSer);

    // insert from method, only take 4
    tiles.insertFrom(more, {num: 4});
    assert(tiles.length, 4);
  });

  it('get and put params cant be null', function() {
    let t = new ra.Tile(4, 4);
    t.fill([0,4,6,0,
            5,7,2,9,
            0,0,0,3,
            0,1,8,0]);
    assert.equal(t.get(2, 1), 2);

    assert.throws(() => {
      t.get(null, 1);
    }, /get: x is null/);

    assert.throws(() => {
      t.get(2, null);
    }, /get: y is null/);

    assert.throws(() => {
      t.put(null, 1, 9);
    }, /put: x is null/);

    assert.throws(() => {
      t.put(2, null, 9);
    }, /put: y is null/);
  });


});
