var assert = require('assert');
var util = require('./util.js');
var ra = require('../src/lib.js');

describe('Polygon Rotation', function() {
  it('polygon rotation', function() {
    let tmpdir = util.mkTmpDir();
    let tmpout = tmpdir + '/actual.png';
    ra.resetState();

    ra.setSize({w: 40, h: 40});
    ra.fillBackground(0);

    let centers = [];

    let polygon = [[2, 3], [14, 3], [10, 7], [6, 7]];
    ra.setColor(0x15);
    ra.fillPolygon(polygon, 0, 0);
    ra.drawPolygon(polygon, 14, 0);
    centers.push(ra.makePolygon(polygon).center());

    rotated = ra.rotatePolygon(polygon, ra.TAU/8);
    centers.push(rotated.center());

    ra.setColor(0x35);
    ra.fillPolygon(rotated, 0,  10);
    ra.drawPolygon(rotated, 14, 10);

    rotated = ra.rotatePolygon(polygon, ra.TAU/8 + 1.1);
    centers.push(rotated.center());

    ra.setColor(0x37);
    ra.fillPolygon(rotated, 0,  24);
    ra.drawPolygon(rotated, 14, 24);

    for (let i = 0; i < centers.length; i++) {
      assert(Math.abs(centers[i][0] - 8.5) < 0.00001);
      assert(Math.abs(centers[i][1] - 5.5) < 0.00001);
    }

    util.renderCompareTo(ra, 'test/testdata/polygon_rotate.png');
  });
});
