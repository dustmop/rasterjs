var assert = require('assert');
var util = require('./util.js');
var ra = require('../src/lib.js');

describe('Rect and square', function() {
  it('shapes fill and draw', function() {
    ra.resetState();

    ra.setSize({w: 40, h: 12});
    ra.fillColor(0);

    // Squares
    ra.setColor(0x10);
    ra.fillSquare({x:  2, y: 2, size: 4});
    ra.setColor(0x11);
    ra.drawSquare({x:  8, y: 2, size: 4});

    // Rectangles
    ra.setColor(0x12);
    ra.fillRect({x: 15, y: 2, w: 3, h: 5});
    ra.setColor(0x13);
    ra.drawRect({x: 20, y: 2, w: 3, h: 5});

    ra.setColor(0x14);
    ra.fillRect({x: 25, y: 2, w: 6, h: 3});

    ra.setColor(0x15);
    ra.drawRect({x: 32, y: 2, w: 6, h: 3});

    // Draw square overscreen
    ra.setColor(0x07); // top white
    ra.drawSquare({x:  1, y: -1, size: 2});
    ra.setColor(0x05); // right light grey
    ra.drawSquare({x: 39, y:  1, size: 2});
    ra.setColor(0x03); // bottom medium grey
    ra.drawSquare({x:  1, y: 11, size: 2});
    ra.setColor(0x01); // left dark grey
    ra.drawSquare({x: -1, y:  1, size: 2});

    // Fill square overscreen
    ra.setColor(0x01); // left dark grey
    ra.fillSquare({x: -1, y:  4, size: 2});
    ra.setColor(0x03); // bottom medium grey
    ra.fillSquare({x:  4, y: 11, size: 2});
    ra.setColor(0x05); // right light grey
    ra.fillSquare({x: 39, y:  4, size: 2});
    ra.setColor(0x07); // top white
    ra.fillSquare({x:  4, y: -1, size: 2});

    // Draw rect overscreen
    ra.setColor(0x07); // top white
    ra.drawRect({x:  7, y: -1, w: 2, h: 2});
    ra.setColor(0x05); // right light grey
    ra.drawRect({x: 39, y:  7, w: 2, h: 2});
    ra.setColor(0x03); // bottom medium grey
    ra.drawRect({x:  7, y: 11, w: 2, h: 2});
    ra.setColor(0x01); // left dark grey
    ra.drawRect({x: -1, y:  7, w: 2, h: 2});

    // Fill square overscreen
    ra.setColor(0x01); // left dark grey
    ra.fillSquare({x: -1, y: 10, size: 2});
    ra.setColor(0x03); // bottom medium grey
    ra.fillSquare({x: 10, y: 11, size: 2});
    ra.setColor(0x05); // right light grey
    ra.fillSquare({x: 39, y: 10, size: 2});
    ra.setColor(0x07); // top white
    ra.fillSquare({x: 10, y: -1, size: 2});

    // Off-screen
    ra.setColor(0x22);
    ra.drawSquare({x: -4, y: -4, size: 4});
    ra.drawSquare({x: 40, y:  4, size: 4});
    ra.drawSquare({x:  4, y: 12, size: 4});

    util.renderCompareTo(ra, 'test/testdata/rect_square.png');
  });

  it('alternate params', function() {
    ra.resetState();

    ra.setSize({w: 40, h: 12});
    ra.fillColor(0);

    // Squares
    ra.setColor(0x10);
    ra.fillSquare({x:  2, y: 2, size: 4});
    ra.setColor(0x11);
    ra.drawSquare({x:  8, y: 2, size: 4});

    // Rectangles
    ra.setColor(0x12);
    ra.fillRect({x0: 15, y0: 2, x1: 18, y1: 7});
    ra.setColor(0x13);
    ra.drawRect(20, 2, 3, 5);

    ra.setColor(0x14);
    ra.fillRect({x0: 25, y0: 2, x1: 31, y1: 5});

    ra.setColor(0x15);
    ra.drawRect(32, 2, 6, 3);

    for (let k = 0; k < 4; k++) {
      let a = k*3+1
      let b = k*3+2
      ra.setColor(0x07); // top white
      ra.drawLine( a, 0,  b, 0);
      ra.setColor(0x03); // bottom medium grey
      ra.drawLine( a, 11,  b, 11);
      ra.setColor(0x05); // right light grey
      ra.drawLine(39,  a, 39,  b);
      ra.setColor(0x01); // left dark grey
      ra.drawLine( 0,  a,  0,  b);
    }

    util.renderCompareTo(ra, 'test/testdata/rect_square.png');
  });

  it('negative and zero width', function() {
    ra.resetState();

    ra.setSize({w: 60, h: 9});
    ra.fillColor(0);

    // x0, y0, x1, y1
    ra.setColor(0x10);
    ra.fillRect({x0:  2, y0: 2, x1: 5, y1: 4});
    // Zero size does nothing
    ra.setColor(0x11);
    ra.fillSquare({x:  7, y: 2, size: 0.1});

    // fill width is negative
    // TODO: Bug in rendering
    ra.setColor(0x12);
    ra.fillRect({x: 15, y: 4, w: -3, h: -2});

    // fill positions are backwards
    // TODO: Bug in rendering
    ra.setColor(0x13);
    ra.fillRect({x0: 25, y0: 5, x1: 20, y1: 2});

    // compare to forward positions
    ra.setColor(0x14);
    ra.fillRect({x0: 30, y0: 2, x1: 35, y1: 5});

    // switch only the y
    // TODO: Bug in rendering
    ra.setColor(0x15);
    ra.fillRect({x0: 38, y0: 5, x1: 43, y1: 2});

    // now with draw instead of fill
    // TODO: Bug in rendering
    ra.setColor(0x16);
    ra.drawRect({x0: 45, y0: 5, x1: 50, y1: 2});

    // Fractional width and height
    // TODO: Figure out invariants for how fractional values should work
    ra.setColor(0x17);
    ra.drawRect({x: 53, y: 1, w: 2.4, h: 3.6});

    ra.put( 2, 7, 7);
    ra.put( 7, 7, 7);
    ra.put(15, 7, 7);
    ra.put(25, 7, 7);
    ra.put(30, 7, 7);
    ra.put(38, 7, 7);
    ra.put(45, 7, 7);
    ra.put(53, 7, 7);

    util.renderCompareTo(ra, 'test/testdata/rect_more.png');
  });

});
