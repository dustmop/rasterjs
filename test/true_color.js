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

    util.saveTmpCompareTo(ra, 'test/testdata/true_color.png');

    let pal = ra.getPaletteAll();
    assert.equal(pal.length, 4);
    // Validate palette contents.
    assert.equal(pal[0].rgb, 0x44aa66);
    assert.equal(pal[1].rgb, 0xcc66cc);
    assert.equal(pal[2].rgb, 0x224488);
    assert.equal(pal[3].rgb, 0xdd4444);
    assert.equal(pal[0].color, 0);
    assert.equal(pal[1].color, 1);
    assert.equal(pal[2].color, 2);
    assert.equal(pal[3].color, 3);
  });
});
