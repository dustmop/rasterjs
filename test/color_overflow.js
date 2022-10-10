var assert = require('assert');
var util = require('./util.js');
var ra = require('../src/lib.js');

describe('Color overflow', function() {
  it('works correctly', function() {
    ra.resetState();
    ra.setSize({w: 3, h: 2});

    // Although an explicit rgb color is set for the background,
    // the calls to setTrueColor will overflow the colormap, leading
    // to an arbitrary background color.
    ra.fillTrueColor(0xcc66cc);

    for (let k = 0; k < 300; k++) {
      ra.setTrueColor(k * 100);
    }
    ra.drawDot(1, 0)

    ra.setTrueColor(2);
    ra.drawDot(2, 0);

    util.renderCompareTo(ra, 'test/testdata/color_overflow.png');
  });
});
