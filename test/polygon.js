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

    util.renderCompareTo(ra, 'test/testdata/polygon.png');
  });

  it('draw floats', function() {
    ra.resetState();

    ra.setSize({w: 16, h: 40});
    ra.fillBackground(0);

    // Even floating polygon, center is at a whole number (5.0, 5.0) => width=8
    let points = [
      [ 5.0,  1.5], // top
      [ 8.5,  5.0], // right
      [ 5.0,  8.5], // bottom
      [ 1.5,  5.0], // left
    ];
    ra.setColor(0x25);
    ra.drawPolygon(points);
    ra.fillPolygon(points, 0, 20);

    // Odd floating polygon, center is at half number (4.5, 14.5) => width=7
    points = [
      [ 4.5, 11.5],
      [ 7.5, 14.5],
      [ 4.5, 17.5],
      [ 1.5, 14.5],
    ];
    ra.setColor(0x24);
    ra.drawPolygon(points);
    ra.fillPolygon(points, 0, 20);

    // Odd pixel polygon, center is at half number (12.5, 10.5) => width=5
    points = [
      [12,  8],
      [14, 10],
      [12, 12],
      [10, 10],
    ];
    ra.setColor(0x23);
    ra.drawPolygon(points);
    ra.fillPolygon(points, 0, 20);

    util.renderCompareTo(ra, 'test/testdata/polygon_float.png');
  });
});
