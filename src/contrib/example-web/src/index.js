const ra = require('raster');

ra.setSize(16, 16);
ra.setZoom(8);

function draw() {
  let x = ra.oscil({min: 2, max: 14});
  let y = ra.oscil({min: 2, max: 14, begin: 0.75});
  ra.fillColor(33);
  ra.setColor(29);
  ra.drawCircle({centerX: 8, centerY: 8, r: 6});
  ra.setColor(43);
  ra.drawLine(8, 8, x, y);
}

ra.run(draw);
