var assert = require('assert');
var ra = require('../src/lib.js');

describe('Time', function() {
  it('time and timeCick', function() {
    ra.resetState();
    ra.setSize(8, 8);

    assert.equal(ra.timeTick, 0);
    assert.equal(ra.time, 0.0);

    ra.nextFrame();

    assert.equal(ra.timeTick, 1);
    assert(Math.abs(ra.time - 0.01666) < 0.00001);

    ra.nextFrame();

    assert.equal(ra.timeTick, 2);
    assert(Math.abs(ra.time - 0.03333) < 0.00001);
  });
});
