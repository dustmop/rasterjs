var assert = require('assert');
var util = require('./util.js');
var ra = require('../src/lib.js');

describe('Palette entry', function() {
  it('set color', function() {
    let tmpdir = util.mkTmpDir();
    let tmpout = tmpdir + '/actual.png';
    ra.resetState();

    ra.setSize({w: 14, h: 14});
    ra.fillBackground(0);

    let img = ra.loadImage('test/testdata/line.png');
    ra.drawImage(img, 0, 0);

    let entry = ra.getPaletteEntry(8, 4);
    entry.setColor(0x13);

    util.saveTmpCompareTo(ra, 'test/testdata/pal_set.png');
  });
});
