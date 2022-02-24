const ra = require('../../../src/lib.js');

ra.setSize({w: 20, h: 20});
ra.originAtCenter();

ra.run(function() {
  ra.fillColor(0);
  ra.setColor(0x25);
  let points = [[-6.4, -6.4], [-6.4, 6.4], [6.4, 6.4], [6.4, -6.4]];
  let shape = ra.rotatePolygon(points, ra.time*2);
  ra.fillPolygon(shape);
});
