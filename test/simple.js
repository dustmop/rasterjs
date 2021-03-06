var assert = require('assert');
var util = require('./util.js');
var ra = require('../src/lib.js');

describe('Simple', function() {
  it('draw operations', function() {
    ra.resetState();
    // Red background
    ra.fillColor(0x20);
    ra.setSize({w: 16, h: 16});
    // Green line
    ra.setColor(0x23);
    ra.drawLine(1,1, 5,1);
    // Blue square
    ra.setColor(0x25);
    ra.drawSquare({x: 8, y: 1, size: 4})
    // Purple dot
    ra.setColor(0x1f);
    ra.drawDot({x: 1, y: 6})
    // Orange diagonal line
    ra.setColor(0x21);
    ra.drawLine(1, 8, 12, 10);
    // Yellow diagonal line
    ra.setColor(0x22);
    ra.drawLine(1, 12, 12, 14, true);

    util.renderCompareTo(ra, 'test/testdata/simple.png');
  });
});
