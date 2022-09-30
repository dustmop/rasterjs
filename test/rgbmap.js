var assert = require('assert');
var util = require('./util.js');
var ra = require('../src/lib.js');
var palette = require('../src/palette.js');

describe('rgbmap', function() {
  it('nes', function() {
    ra.resetState();
    ra.setSize({w: 8, h: 8})
    ra.useColors('nes');
    ra.fillPattern([[1,2],[3,4]]);
    util.renderCompareTo(ra, 'test/testdata/colors_nes.png');
  });

  it('dos', function() {
    ra.resetState();
    ra.setSize({w: 8, h: 8})
    ra.useColors('dos');
    ra.fillPattern([[1,2],[3,4]]);
    util.renderCompareTo(ra, 'test/testdata/colors_dos.png');
  });

  it('gameboy', function() {
    ra.resetState();
    ra.setSize({w: 8, h: 8})
    ra.useColors('gameboy');
    ra.fillPattern([[1,2],[3,4]]);
    util.renderCompareTo(ra, 'test/testdata/colors_gameboy.png');
  });

  it('pico8', function() {
    ra.resetState();
    ra.setSize({w: 8, h: 8})
    ra.useColors('pico8');
    ra.fillPattern([[1,2],[3,4]]);
    util.renderCompareTo(ra, 'test/testdata/colors_pico8.png');
  });

  it('zx-spectrum', function() {
    ra.resetState();
    ra.setSize({w: 8, h: 8})
    ra.useColors('zx-spectrum');
    ra.fillPattern([[1,2],[3,4]]);
    util.renderCompareTo(ra, 'test/testdata/colors_zx_spectrum.png');
  });

  it('c64', function() {
    ra.resetState();
    ra.setSize({w: 8, h: 8})
    ra.useColors('c64');
    ra.fillPattern([[1,2],[3,4]]);
    util.renderCompareTo(ra, 'test/testdata/colors_c64.png');
  });

  it('grey', function() {
    ra.resetState();
    ra.setSize({w: 8, h: 8})
    ra.useColors('grey');
    ra.fillPattern([[1,2],[3,4]]);
    util.renderCompareTo(ra, 'test/testdata/colors_grey.png');
  });

  it('custom', function() {
    ra.resetState();
    ra.setSize({w: 8, h: 8})
    ra.useColors([0x000000, 0xa04040, 0x0409050, 0x5050b0]);
    ra.fillPattern([[1,2],[3,4]]);
    util.renderCompareTo(ra, 'test/testdata/colors_custom.png');
  });

  // TODO: add a way to do this.
  // it('gameboy stringify', function() {
  //   ra.resetState();
  //   ra.useColors('gameboy');
  //   let actual = ra.colorMap.toString();
  //   let expect = 'ColorMap{0: #003f00, 1: #2e7320, 2: #8cbf0a, 3: #a0cf0a}';
  //   assert.equal(actual, expect);
  // });

  it('constructFrom', function() {
    let c = palette.constructRGBMapFrom([0xff0088, 0x0044cc, 0x4466aa]);
    let expect = [16711816, 17612, 4482730];
    let actual = c.toString();
    assert.equal(actual, expect);
  });

});
