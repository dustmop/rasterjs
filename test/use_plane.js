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

});
