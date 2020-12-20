var util = require('./util.js');
var ra = require('../src/lib.js');

describe('Circle', function() {
  it('draw operations', function() {
    ra.resetState();

    // Black background
    ra.fillBackground(0);
    ra.setSize({w: 58, h: 27});

    // Circles
    ra.setColor(0x16);
    ra.fillCircle({x: 2, y: 2, r: 8});

    ra.setColor(0x17);
    ra.drawCircle({x: 20, y: 2, r: 8});

    ra.setColor(0x04);
    ra.fillCircle({x: 23, y: 5, r: 5});

    ra.setColor(0x10);
    ra.drawCircle({x: 38, y: 2, r: 8, width: 3});

    // Smaller circle
    ra.setColor(0x32);
    ra.fillCircle({x: 33, y: 17, r: 4.5});

    // Overflow
    ra.setColor(0x07);
    ra.fillCircle({x: 56, y:  2, r: 3});
    ra.fillCircle({x: -4, y: 16, r: 3});
    ra.fillCircle({x: 12, y: 21, r: 3});

    util.saveTmpCompareTo(ra, 'test/testdata/circle.png');
  });
});
