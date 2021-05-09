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

  it('get all', function() {
    ra.resetState();
    let img = ra.loadImage('test/testdata/boss_first_form.png');
    ra.useSystemColors(null);
    ra.fillTrueBackground(0x444444);
    ra.drawImage(img, 0, 0);
    let colors = ra.getPaletteAll({sort: true});
    let actual = [];
    for (let i = 0; i < colors.length; i++) {
      actual.push('0x' + colors[i].rgb.toString(16));
    }
    let expect = [
      "0x444444",
      "0x0",
      "0x4d0e05",
      "0xaaaaaa",
      "0xeaeaea",
      "0xeb0000",
      "0xffbaaf",
      "0x463511",
      "0x8f6a20",
      "0xd3b139",
      "0xf3da94",
      "0x806c8a",
      "0x494349",
      "0x180b0f",
      "0x231418",
      "0x2e1d23",
      "0x34292e",
      "0x493b43",
      "0x5b4951"
    ];
    assert.deepEqual(expect, actual);
  });
});
