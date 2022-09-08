const ra = require('../../../src/lib.js');

let plane = new ra.Plane();
plane.setSize(4);
ra.usePlane(plane);

let tiles0 = ra.loadImage('test/testdata/tiles.png');
let tiles1 = ra.loadImage('test/testdata/tiles1.png');
let tiles2 = ra.loadImage('test/testdata/tiles2.png');
ra.useTileset([tiles0, tiles1, tiles2], {tile_width: 4, tile_height: 4});

plane.fillPattern([[2, 6, 1, 3],
                   [6, 7, 7, 7],
                   [5, 5, 1, 0],
                   [6, 4, 2, 2]]);

function draw() {
  if (ra.timeTick % 4) {
    return;
  }
  let c = Math.floor(ra.timeTick / 4) % 4;
  if (c == 3) {
    ra.setTileset(1);
  } else {
    ra.setTileset(c);
  }
}

ra.run(draw);
