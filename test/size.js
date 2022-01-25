var util = require('./util.js');
var ra = require('../src/lib.js');

describe('Size', function() {
  it('set using a single int', function() {
    ra.resetState();

    ra.fillBackground(4);
    ra.setSize(8);

    ra.setColor(0x22);
    ra.drawDot(5, 7);
    ra.drawDot(6, 6);
    ra.drawDot(7, 5);
    ra.drawDot(6, 7);
    ra.drawDot(7, 6);
    ra.drawDot(7, 7);

    util.renderCompareTo(ra, 'test/testdata/fill_clear.png');
  });
});
