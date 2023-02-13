var util = require('./util.js');
var ra = require('../src/lib.js');
var assert = require('assert');

describe('Basic', function() {
  it('fill square', function() {
    ra.resetState();
    ra.setSize(16, 16);
    ra.fillColor(0);
    ra.setColor(28);
    ra.fillSquare({x: 3, y: 5, size: 7});
    util.renderCompareTo(ra, 'test/testdata/green_square.png');
  });

  it('then draw', function() {
    ra.resetState();
    ra.setSize(16, 16);
    ra.fillColor(0);
    ra.then(function() {
      ra.setColor(28);
      ra.fillSquare({x: 3, y: 5, size: 7});
      util.renderCompareTo(ra, 'test/testdata/green_square.png');
    });
  });

  it('fill color orange', function() {
    ra.resetState();
    ra.setSize(8, 8);
    ra.fillColor(25);
    util.renderCompareTo(ra, 'test/testdata/solid-orange.png');
  });

  it('fill color blue', function() {
    ra.resetState();
    ra.setSize(8, 8);
    ra.fillColor(29);
    util.renderCompareTo(ra, 'test/testdata/solid-blue.png');
  });

  it('fill color needs number', function() {
    ra.resetState();
    ra.setSize(8, 8);
    assert.throws(() => {
      ra.fillColor('hi');
    }, /plane.fillColor needs integer/);
    ra.fillColor(3.5);
    assert.equal(ra.plane.bgColor, 3);
  });

  it('set color needs number', function() {
    ra.resetState();
    ra.setSize(8, 8);
    assert.throws(() => {
      ra.setColor('hi');
    }, /plane.setColor needs integer/);
    ra.setColor(7.1);
    assert.equal(ra.plane.frontColor, 7);
  });

  it('do not wrap', function() {
    ra.resetState();
    ra.setSize(18);

    let polygon = [
      [4, 7],
      [16, 8],
      [25, 13],
      [5, 14],
    ];

    let rot = ra.rotatePolygon(polygon, 2.0);
    ra.fillPolygon(rot);

    ra.put(1, 1, 7);
    ra.put(24, 1, 7);
    ra.put(-9, 1, 7);

    let v = ra.get(4, 8);
    assert.equal(v, 0);
    v = ra.get(1, 1);
    assert.equal(v, 7);
    v = ra.get(24, 8);
    assert.equal(v, null);

    util.renderCompareTo(ra, 'test/testdata/polygon-draw.png');
  });

  it('ra.nge', function() {
    let actual = ra.nge({start: 4, length: 5});
    let expect = [4, 5, 6, 7, 8];
    assert.deepEqual(actual, expect);
  });

  it('fold', function() {
    ra.resetState();

    ra.setSize(14);
    ra.fillColor(0);
    ra.setColor(31);
    ra.fold('fillRect', [{x: 1, y: 1, w: 3, h: 12}, {w: 10, h: 3}, {y: 10},
                         {y: 6, w: 8, h: 2}]);
    util.renderCompareTo(ra, 'test/testdata/letter_e.png');
  });

});
