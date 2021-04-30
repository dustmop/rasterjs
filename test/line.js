var util = require('./util.js');
var ra = require('../src/lib.js');

describe('Line', function() {
  it('draw directions', function() {
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

  it('draw float', function() {
    ra.resetState();

    ra.fillBackground(0);
    ra.setSize(13, 13);

    //red
    ra.setColor(0x18);
    ra.drawLine(0.7, 0.8, 5.4, 2.4);

    //blue
    ra.setColor(0x1e);
    ra.drawLine(7, 1, 10, 1);

    //yellow
    ra.setColor(0x1a);
    ra.drawLine(6, 3, 9, 6);

    //purple
    ra.setColor(0x1f);
    ra.drawLine(11, 3, 11, 5);

    //green
    ra.setColor(0x1c);
    ra.drawLine(1.2, 4.3, 3.3, 7.2);

    //light blue
    ra.setColor(0x1d);
    ra.drawLine(1.0, 12.0, 3.5, 8.4);

    //orange
    ra.setColor(0x19);
    ra.drawLine(7.4, 10.4, 11.1, 8.2);

    util.saveTmpCompareTo(ra, 'test/testdata/line_float.png');
  });
});
