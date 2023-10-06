const ra = require('../../src/lib.js');
const assert = require('assert');

describe('SDL click', () => {
  it('can be sent', (success) => {
    ra.resetState();
    ra.useDisplay('sdl');

    // handle an incoming click
    ra.on('click', (e) => {
      let expectX = 3;
      let expectY = 4;
      // ensure click event matches
      assert.equal(e.x, expectX);
      assert.equal(e.y, expectY);
      success();
    });

    // low-level hook to send a click event
    ra.display._testOnlySendClick({x:3,y:4});
  });
});
