var util = require('./util.js');
var ra = require('../src/lib.js');

describe('Circle', function() {
  it('draw operations', function() {
    ra.resetState();

    // Black background
    ra.fillBackground(0);
    ra.setSize({w: 58, h: 27});

    ra.fillFrame(function(mem, x, y) {
      if (x + y & 1) {
        return 0x01;
      }
    });

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
    ra.fillCircle({x: 12, y: 22, r: 3});

    util.saveTmpCompareTo(ra, 'test/testdata/circle.png');
  });

  it('circle small sizes', function() {
    ra.resetState();

    ra.setSize({w: 44, h: 108});

    // Size 0.5
    ra.setColor(0x28);
    ra.fillCircle({x: 2, y: 1, r: 0.5});

    // Size 1.5
    ra.setColor(0x29);
    ra.fillCircle({x: 2, y: 5, r: 1.5});

    // Size 2.5
    ra.setColor(0x2a);
    ra.fillCircle({x: 2, y: 11, r: 2.5});

    // Size 3.5
    ra.setColor(0x2b);
    ra.fillCircle({x: 2, y: 19, r: 3.5});

    // Size 4.5
    ra.setColor(0x2c);
    ra.fillCircle({x: 2, y: 29, r: 4.5});

    // Size 5.5
    ra.setColor(0x2d);
    ra.fillCircle({x: 2, y: 41, r: 5.5});

    // Size 6.5
    ra.setColor(0x2e);
    ra.fillCircle({x: 2, y: 55, r: 6.5});

    // Size 7.5
    ra.setColor(0x2f);
    ra.fillCircle({x: 2, y: 71, r: 7.5});

    // Size 8.5
    ra.setColor(0x30);
    ra.fillCircle({x: 2, y: 89, r: 8.5});

    // Size 1
    ra.setColor(0x28);
    ra.fillCircle({x: 24, y: 1, r: 1});

    // Size 2
    ra.setColor(0x29);
    ra.fillCircle({x: 24, y: 5, r: 2});

    // Size 3
    ra.setColor(0x2a);
    ra.fillCircle({x: 24, y: 11, r: 3});

    // Size 4
    ra.setColor(0x2b);
    ra.fillCircle({x: 24, y: 19, r: 4});

    // Size 5
    ra.setColor(0x2c);
    ra.fillCircle({x: 24, y: 29, r: 5});

    // Size 6
    ra.setColor(0x2d);
    ra.fillCircle({x: 24, y: 41, r: 6});

    // Size 7
    ra.setColor(0x2e);
    ra.fillCircle({x: 24, y: 55, r: 7});

    // Size 8
    ra.setColor(0x2f);
    ra.fillCircle({x: 24, y: 71, r: 8});

    // Size 9
    ra.setColor(0x30);
    ra.fillCircle({x: 24, y: 89, r: 9});

    util.saveTmpCompareTo(ra, 'test/testdata/circle_sizes.png');
  });
});
