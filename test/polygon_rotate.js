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

    let polygon = [[2, 3], [14, 3], [10, 7], [6, 7]];
    ra.setColor(0x15);
    ra.fillPolygon(polygon, 0, 0);
    ra.drawPolygon(polygon, 14, 0);

    rotated = ra.rotatePolygon(polygon, ra.TAU/8);

    ra.setColor(0x35);
    ra.fillPolygon(rotated, 0,  10);
    ra.drawPolygon(rotated, 14, 10);

    rotated = ra.rotatePolygon(polygon, 1.1);

    ra.setColor(0x37);
    ra.fillPolygon(rotated, 0,  24);
    ra.drawPolygon(rotated, 14, 24);


    ra.save(tmpout);
    if (!util.compareFiles('test/testdata/polygon_rotate.png', tmpout)) {
      console.log('open ' + tmpout);
    }
    assert.ok(util.compareFiles('test/testdata/polygon_rotate.png', tmpout));
  });
});
