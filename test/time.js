var assert = require('assert');
var ra = require('../src/lib.js');

describe('Time', () => {
  it('time and timeCick', (success) => {
    ra.resetState();
    ra.setSize(8, 8);
    ra.lockTimeToTick();

    assert.equal(ra.tick, 0);
    assert.equal(ra.time, 0.0);

    ra.runFrame(() => {
      assert.equal(ra.tick, 1);
      assert(Math.abs(ra.time - 0.01666) < 0.00001);
      ra.runFrame(() => {
        assert.equal(ra.tick, 2);
        assert(Math.abs(ra.time - 0.03333) < 0.00001);
        success();
      });
    });
  });
});
