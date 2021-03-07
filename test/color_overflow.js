var assert = require('assert');
var util = require('./util.js');
var ra = require('../src/lib.js');

describe('Color overflow', function() {
  it('works correctly', function() {
    ra.resetState();
    ra.setSize({w: 3, h: 2});

    ra.fillTrueBackground(0xcc66cc);

    for (let k = 0; k < 300; k++) {
      ra.setTrueColor(k * 100);
    }
    ra.drawDot(1, 0)

    ra.setTrueColor(2);
    ra.drawDot(2, 0);

    util.saveTmpCompareTo(ra, 'test/testdata/color_overflow.png');
  });
});