var util = require('./util.js');
var ra = require('../src/lib.js');

describe('Real Color', function() {
  it('real color drawing', function() {
    ra.resetState();
    ra.setSize({w: 8, h: 8});

    ra.fillRealBackground(0xcc66cc);
    ra.setRealColor(0x44aa66);
    ra.fillSquare({x:0, y: 0, size: 3});

    ra.setRealColor(0x224488);
    ra.fillSquare({x:6, y: 1, size: 2});

    ra.setRealColor(0xdd4444);
    ra.fillSquare({x:1, y: 4, size: 2});

    ra.setRealColor(0x44aa66);
    ra.fillSquare({x:4, y: 5, size: 3});

    util.saveTmpCompareTo(ra, 'test/testdata/real_color.png');

    // TODO: Get palette, it should have 4 entries, not 5.
  });
});
