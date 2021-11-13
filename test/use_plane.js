var assert = require('assert');
var util = require('./util.js');
var ra = require('../src/lib.js');

describe('Use plane', function() {
  it('draw to it', function() {
    ra.resetState();

    let plane = new ra.Plane();
    plane.setSize(16);
    ra.usePlane(plane);

    plane.setColor(28);
    plane.fillSquare(3, 5, 7);

    util.saveTmpCompareTo(ra, 'test/testdata/green_square.png');
  });

  it('set scroll', function() {
    ra.resetState();

    let plane = new ra.Plane();
    plane.setSize(16);
    ra.usePlane(plane);

    plane.setColor(28);
    plane.fillSquare(3, 5, 7);

    ra.setSize(10);
    ra.setScrollX(4);
    ra.setScrollY(2);

    util.saveTmpCompareTo(ra, 'test/testdata/scroll_square.png');
  });

  it('methods can destructure', function() {
    ra.resetState();

    let plane = new ra.Plane();
    plane.setSize(16);
    ra.usePlane(plane);

    plane.setColor(28);
    plane.fillSquare({x: 3, y: 5, size: 7});

    util.saveTmpCompareTo(ra, 'test/testdata/green_square.png');
  });

  it('ra loses methods', function() {
    ra.resetState();

    let plane = new ra.Plane();
    plane.setSize(16);
    ra.usePlane(plane);

    assert.throws(function() {
      ra.setColor(28);
    }, /ra.setColor is not a function/);
    assert.throws(function() {
      ra.fillSquare({x: 3, y: 5, size: 7});
    }, /ra.fillSquare is not a function/);
  });

  it('useTileset requires usePlane', function() {
    ra.resetState();

    let tiles = new ra.Plane();
    tiles.setSize(16);
    // TODO: Shouldn't need this call, lazy evaluation requires it
    tiles.drawDot(0, 0);
    ra.useTileset(tiles, {tile_width: 4, tile_height: 4});

    assert.throws(function() {
      // TODO: Using private value
      ra.scene.aPlane.render();
    }, /Error: cannot use tileset without also using plane/);
  });

});