const ra = require('../../../src/lib.js');

ra.resetState();
ra.setSize(8);

ra.showFrame(function(mem, x, y) {
  return y * 3 + x + 15;
});
