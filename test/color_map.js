var assert = require('assert');
var util = require('./util.js');
var ra = require('../src/lib.js');

describe('Color map', function() {
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

  it('no dups', function() {
    ra.resetState();
    ra.setSize({w: 8, h: 8})
    assert.throws(function() {
      ra.useColors([1, 2, 3, 3]);
    }, /Error: duplicate color in set: RGBColor{#000003}/);
  });

  it('too late', function() {
    ra.resetState();
    ra.setSize({w: 8, h: 8})
    ra.setColor(1);
    assert.throws(function() {
      ra.useColors('nes');
    }, /Error: cannot use colorMap "nes", already using "quick"/);
  });

  it('frozen', function() {
    ra.resetState();
    ra.useColors('pico8');
    ra.setSize({w: 8, h: 8})
    assert.throws(function() {
      ra.setTrueColor(1);
    }, /Error: colorMap is frozen, cannot extend with RGBColor{#000001}/);
  });

  // TODO: useColors(null) crash
  // TODO: useColors(null) -> drawImage
  // TODO: useColors(null) -> setTrueColor
  // TODO: useColors(dos) -> setTrueColor
  // TODO: useColors(ega)
  // TODO: useColors(cga)
  // TODO: useColors(vga)
  // TODO: useColors(master_system)
});
