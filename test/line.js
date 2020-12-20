var util = require('./util.js');
var ra = require('../src/lib.js');

describe('Line', function() {
  it('draw operations', function() {
    ra.resetState();

    // Black background
    ra.fillBackground(0);
    ra.setSize({w: 14, h: 14});

    // Horizontal line
    ra.setColor(0x20);
    ra.drawLine(3,  4, 6, 4);
    ra.drawLine(3,  6, 6, 7);
    ra.drawLine(3, 10, 6, 9);

    // Vertical line
    ra.setColor(0x21);
    ra.drawLine( 8, 4, 9, 7);
    ra.drawLine(12, 4, 11, 7);

    // Overflow left and right
    ra.setColor(0x22);
    ra.drawLine(-2, 1,  1, 1);
    ra.setColor(0x23);
    ra.drawLine(12, 1, 15, 1);

    // Overflow top and bottom
    ra.setColor(0x24);
    ra.drawLine(6, -2, 6,  1);
    ra.setColor(0x26);
    ra.drawLine(9, 12, 9, 15);

    util.saveTmpCompareTo(ra, 'test/testdata/line.png');
  });
});
