var assert = require('assert');
var util = require('./util.js');
var ra = require('../src/lib.js');

describe('True Color', function() {
  it('true color drawing', function() {
    ra.resetState();
    ra.setSize({w: 8, h: 8});

    ra.fillTrueBackground(0xcc66cc);
    ra.setTrueColor(0x44aa66);
    ra.fillSquare({x:0, y: 0, size: 3});

    ra.setTrueColor(0x224488);
    ra.fillSquare({x:6, y: 1, size: 2});

    ra.setTrueColor(0xdd4444);
    ra.fillSquare({x:1, y: 4, size: 2});

    ra.setTrueColor(0x44aa66);
    ra.fillSquare({x:4, y: 5, size: 3});

    util.renderCompareTo(ra, 'test/testdata/true_color.png');

    let pal = ra.getPaletteAll();
    assert.equal(pal.length, 68);
    // Validate palette contents.
    assert.equal(pal[64].rgb.toInt(), 0xcc66cc);
    assert.equal(pal[65].rgb.toInt(), 0x44aa66);
    assert.equal(pal[66].rgb.toInt(), 0x224488);
    assert.equal(pal[67].rgb.toInt(), 0xdd4444);
    for (let k = 0; k < pal.length; k++) {
      assert.equal(pal[k].idx, k);
    }
  });
});
