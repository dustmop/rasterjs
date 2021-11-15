const ra = require('raster');

ra.setSize(80, 40);
ra.setZoom(8);

ra.fillColor(45);
ra.setColor(30);

for (let j = 0; j < 2; j++) {
  let sel = ra.select({x:4, y:6-j, w:76, h:32});

  for (let offs = 0; offs < 39; offs += 38) {
    sel.fillRect({x:  offs, y:0, w:4, h:24});
    sel.fillRect({x:10+offs, y:0, w:4, h:24});
    sel.drawCircle({x:18+offs, y:8, r:8, width:4});
  }

  sel.fillRect({x: 0, y:10, w:12, h:4});
  sel.fillRect({x:20, y:14, w:12, h:3});

  ra.setColor(38);
}

ra.setColor(30);
ra.drawLine(32, 22, 37, 22);
ra.setColor(45);
ra.drawLine(32, 23, 37, 23);
ra.drawDot(37, 24);

ra.run(function() {
  ra.setScrollY(ra.oscil(240)*10.0-6.0);
});
