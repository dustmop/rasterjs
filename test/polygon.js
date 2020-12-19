var assert = require('assert');
var util = require('./util.js');
var ra = require('../src/lib.js');

describe('Polygon', function() {
  it('draw polygon', function() {
    let tmpdir = util.mkTmpDir();
    let tmpout = tmpdir + '/actual.png';
    ra.resetState();

    ra.setSize({w: 36, h: 34});
    ra.fillBackground(0);

    let polygon = [[2, 3], [14, 3], [10, 7], [6, 7]];
    ra.setColor(0x15);
    ra.drawPolygon(polygon);

    ra.setColor(0x16);
    for (let i = 0; i < 4; i++) {
      let start = polygon[i];
      let end   = polygon[i+1];
      if (i == 3) {
        end = polygon[0];
      }
      ra.drawLine({x0: start[0]+16, y0: start[1], x1: end[0]+16, y1: end[1]});
    }

    ra.setColor(0x21);
    ra.drawPolygon(polygon, 0, 6);

    ra.setColor(0x22);
    ra.fillPolygon(polygon, 16, 6);

    polygon = [[2, 5], [5, 2], [5, 8]];
    ra.setColor(0x32);
    ra.fillPolygon(polygon,  0, 14);
    ra.drawPolygon(polygon,  8, 14);

    polygon = [[5, 5], [2, 2], [2, 8]];
    ra.setColor(0x33);
    ra.fillPolygon(polygon, 19, 14);
    ra.drawPolygon(polygon, 27, 14);

    polygon = [[5, 5], [8, 8], [2, 8]];
    ra.setColor(0x34);
    ra.fillPolygon(polygon,  0, 20);
    ra.drawPolygon(polygon,  8, 20);

    polygon = [[5, 8], [8, 5], [2, 5]];
    ra.setColor(0x35);
    ra.fillPolygon(polygon, 16, 20);
    ra.drawPolygon(polygon, 24, 20);

    ra.save(tmpout);
    if (!util.compareFiles('test/testdata/polygon.png', tmpout)) {
      console.log('open ' + tmpout);
    }
    assert.ok(util.compareFiles('test/testdata/polygon.png', tmpout));
  });
});
