var assert = require('assert');
var util = require('./util.js');
var ra = require('../src/lib.js');

describe('Color set', function() {
  it('nes', function() {
    ra.resetState();
    ra.setSize({w: 8, h: 8})
    ra.useColors('nes');
    ra.fillDot([[1,2],[3,4]]);
    util.saveTmpCompareTo(ra, 'test/testdata/colors_nes.png');
  });

  it('dos', function() {
    ra.resetState();
    ra.setSize({w: 8, h: 8})
    ra.useColors('dos');
    ra.fillDot([[1,2],[3,4]]);
    util.saveTmpCompareTo(ra, 'test/testdata/colors_dos.png');
  });

  it('gameboy', function() {
    ra.resetState();
    ra.setSize({w: 8, h: 8})
    ra.useColors('gameboy');
    ra.fillDot([[1,2],[3,4]]);
    util.saveTmpCompareTo(ra, 'test/testdata/colors_gameboy.png');
  });

  it('pico8', function() {
    ra.resetState();
    ra.setSize({w: 8, h: 8})
    ra.useColors('pico8');
    ra.fillDot([[1,2],[3,4]]);
    util.saveTmpCompareTo(ra, 'test/testdata/colors_pico8.png');
  });

  it('zx-spectrum', function() {
    ra.resetState();
    ra.setSize({w: 8, h: 8})
    ra.useColors('zx-spectrum');
    ra.fillDot([[1,2],[3,4]]);
    util.saveTmpCompareTo(ra, 'test/testdata/colors_zx_spectrum.png');
  });

  it('c64', function() {
    ra.resetState();
    ra.setSize({w: 8, h: 8})
    ra.useColors('c64');
    ra.fillDot([[1,2],[3,4]]);
    util.saveTmpCompareTo(ra, 'test/testdata/colors_c64.png');
  });

  it('grey', function() {
    ra.resetState();
    ra.setSize({w: 8, h: 8})
    ra.useColors('grey');
    ra.fillDot([[1,2],[3,4]]);
    util.saveTmpCompareTo(ra, 'test/testdata/colors_grey.png');
  });

  it('custom', function() {
    ra.resetState();
    ra.setSize({w: 8, h: 8})
    ra.useColors([0x000000, 0xa04040, 0x0409050, 0x5050b0]);
    ra.fillDot([[1,2],[3,4]]);
    util.saveTmpCompareTo(ra, 'test/testdata/colors_custom.png');
  });

  it('append', function() {
    ra.resetState();
    ra.setSize({w: 8, h: 8})
    let first = ra.useColors([0x404040, 0xff0000, 0x00ff00, 0x0000ff]);
    let second = ra.appendColors([0xff80ff]);
    ra.fillDot([[1,2],[3,4]]);
    util.saveTmpCompareTo(ra, 'test/testdata/colors_append.png');
    assert.equal(first, 4);
    assert.equal(second, 5);
    assert.equal(ra.numColors(), 5);
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
