var assert = require('assert');
var util = require('./util.js');
var ra = require('../src/lib.js');

describe('Tileset', function() {
  it('tiles from image', function() {
    ra.resetState();

    let plane = new ra.Plane();
    plane.setSize(4);

    let tiles = ra.loadImage('test/testdata/tiles.png');
    ra.useTileset(tiles, {tile_width: 4, tile_height: 4});
    ra.usePlane(plane);

    plane.fillDot([[2, 6, 1, 3],
                   [6, 7, 7, 7],
                   [5, 5, 1, 0],
                   [6, 4, 2, 2]]);

    util.saveTmpCompareTo(ra, 'test/testdata/map_of_tiles.png');
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

    plane.fillDot([[ 0, 0, 1, 0],
                   [ 0, 1, 0, 0],
                   [ 0, 0, 1, 2],
                   [ 0, 0, 0, 0],
                  ]);

    util.saveTmpCompareTo(ra, 'test/testdata/drawn_tiles.png');

    tiles.drawDot(2, 0);
    tiles.drawDot(0, 2);
    tiles.drawDot(2, 2);
    util.saveTmpCompareTo(ra, 'test/testdata/modify_tiles.png');
  });

  it('missing dimension', function() {
    ra.resetState();

    let plane = new ra.Plane();
    plane.setSize(4);

    let tiles = ra.loadImage('test/testdata/tiles.png');
    assert.throws(function() {
      ra.useTileset(tiles, {tile_height: 8});
    }, /Error: invalid tileSet detail: missing tile_width/);
  });

  it('invalid dimension', function() {
    ra.resetState();

    let plane = new ra.Plane();
    plane.setSize(4);

    let tiles = ra.loadImage('test/testdata/tiles.png');
    assert.throws(function() {
      ra.useTileset(tiles, {tile_width: 4, tile_height: 10});
    }, /Error: tileSet's tile_height is too larger than source data/);
  });

  it('bad tile number', function() {
    ra.resetState();

    let plane = new ra.Plane();
    plane.setSize(4);

    let tiles = ra.loadImage('test/testdata/tiles.png');
    ra.useTileset(tiles, {tile_width: 4, tile_height: 4});
    ra.usePlane(plane);

    plane.fillDot([[2, 6, 1, 3],
                   [6, 7,15, 7],
                   [5, 5, 1, 0],
                   [6, 4, 2, 2]]);

    assert.throws(function() {
      // TODO: Using private value
      ra.scene.aPlane.render();
    }, /Error: invalid tile number 15 at 2,1/);

  });

});
