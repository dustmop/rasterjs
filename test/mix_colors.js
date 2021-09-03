var assert = require('assert');
var ra = require('../src/lib.js');

describe('Mix colors', function() {
  it('fire', function() {
    let actual = ra.mixColors([ 0, 0x000000,
                               16, 0xff0000,
                               32, 0xff8800,
                               44, 0xffff00,
                               48, 0xffffff]);
    let expect = [0x000000, 0x100000, 0x200000, 0x300000, 0x400000, 0x500000,
                  0x600000, 0x700000, 0x800000, 0x8f0000, 0x9f0000, 0xaf0000,
                  0xbf0000, 0xcf0000, 0xdf0000, 0xef0000, 0xff0000, 0xff0900,
                  0xff1100, 0xff1a00, 0xff2200, 0xff2b00, 0xff3300, 0xff3c00,
                  0xff4400, 0xff4d00, 0xff5500, 0xff5e00, 0xff6600, 0xff6f00,
                  0xff7700, 0xff8000, 0xff8800, 0xff9200, 0xff9c00, 0xffa600,
                  0xffb000, 0xffba00, 0xffc400, 0xffcd00, 0xffd700, 0xffe100,
                  0xffeb00, 0xfff500, 0xffff00, 0xffff40, 0xffff80, 0xffffbf];
    let expectHex = expect.map(e => '0x' + e.toString(16));
    let actualHex = actual.map(e => '0x' + e.toString(16));
    assert.deepEqual(expectHex, actualHex);
  });
});
