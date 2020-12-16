var assert = require('assert');
var util = require('./util.js');
var ra = require('../src/lib.js');

describe('Fill', function() {
  it('frame using oscil', function() {
    let tmpdir = util.mkTmpDir();
    let tmpout = tmpdir + '/actual.png';
    ra.resetState();
    // Small frame
    ra.setSize({w: 8, h: 8});
    // Draw some bits
    ra.fillFrame(function(mem, x, y) {
      let i = y*mem.pitch + x;
      if (ra.oscil(54, undefined, i*76) > 0.5) {
        return 0x22;
      }
    });
    ra.save(tmpout);
    assert.ok(util.compareFiles('test/testdata/fill_oscil.png', tmpout));
  });
});
