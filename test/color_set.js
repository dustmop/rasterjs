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
  // TODO: useColors(null) crash
  // TODO: useColors(null) -> drawImage
  // TODO: useColors(null) -> setTrueColor
  // TODO: useColors(dos) -> setTrueColor
  // TODO: useColors(ega)
  // TODO: useColors(cga)
  // TODO: useColors(vga)
  // TODO: useColors(gameboy)
  // TODO: useColors(zx_spectrum)
  // TODO: useColors(pico8)
  // TODO: useColors(master_system)
  // TODO: useColors([0xff0000, 0x00ff00, 0x0000ff])
});
