const ra = require('../../../src/lib.js');

ra.setSize({w: 4, h: 4});
ra.setZoom(8);

ra.run(function() {
  let colors = [24, 29, 33, 31];
  let t = Math.floor(ra.timeTick / 16);
  ra.fillColor(colors[t % colors.length]);
});
