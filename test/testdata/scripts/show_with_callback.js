const ra = require('../../../src/lib.js');

ra.resetState();
ra.setSize(20);

ra.show(function() {
  ra.setColor(0x25);
  ra.fillSquare(3, 3, 14);
  ra.setColor(0);
  ra.drawDot(3, 3);
  ra.drawDot(16, 16);
  ra.drawDot(3, 16);
  ra.drawDot(16, 3);
});
