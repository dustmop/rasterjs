var assert = require('assert');
var util = require('./util.js');
var ra = require('../src/lib.js');

describe('Fill previous', function() {
  it('get value from previous memory', function() {
    let tmpdir = util.mkTmpDir();
    let tmpout = tmpdir + '/actual.png';
    ra.resetState();

    ra.setSize({w: 7, h: 7});
    ra.setZoom(10);
    ra.fillBackground(0);

    ra.fillFrame(function(mem) {
      // TODO: Does this need to be here?
      mem.getPrevious(0, 0);
      mem.put(1, 1, 0x30);
      mem.put(1, 5, 0x36);
    });

    let oldA = null;
    let oldB = null;
    let newA = null;
    let newB = null;

    // TODO: What are the semantics of calling fillFrame twice? Does it mean
    // that a new frame has started? Or does it mean that the frame fill needs
    // two passes? Or should it be an error?
    ra.fillFrame(function(mem) {
      oldA = mem.getPrevious(1, 1);
      oldB = mem.getPrevious(1, 5);
      let avg = Math.floor((oldA + oldB) / 2);

      newA = mem.get(1, 1);
      newB = mem.get(1, 5);

      mem.put(1, 1, colorClamp(oldA - 8));
      mem.put(1, 5, colorClamp(oldB - 8));
      mem.put(1, 3, avg);
    });

    util.saveTmpCompareTo(ra, 'test/testdata/fill_prev.png');

    assert.equal(oldA, 0x30);
    assert.equal(newA, 0);
    assert.equal(oldB, 0x36);
    assert.equal(newB, 0);
  });
});

function colorClamp(n) {
  if (n < 8) {
    return 0;
  }
  return n;
}
