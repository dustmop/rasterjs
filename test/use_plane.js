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

    util.renderCompareTo(ra, 'test/testdata/green_square.png');
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

    util.renderCompareTo(ra, 'test/testdata/scroll_square.png');
  });

  it('scroll same plane', function() {
    ra.resetState();
    ra.setSize(16);

    let img = ra.loadImage('test/testdata/simple.png');
    ra.drawImage(img);

    ra.setScrollX(4);
    ra.setScrollY(2);

    util.renderCompareTo(ra, 'test/testdata/scroll_simple.png');
  });

  it('methods can destructure', function() {
    ra.resetState();

    let plane = new ra.Plane();
    plane.setSize(16);
    ra.usePlane(plane);

    plane.setColor(28);
    plane.fillSquare({x: 3, y: 5, size: 7});

    util.renderCompareTo(ra, 'test/testdata/green_square.png');
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

});
