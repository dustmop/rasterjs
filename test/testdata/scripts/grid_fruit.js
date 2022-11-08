const ra = require('../../../src/lib.js');

ra.resetState();
ra.setZoom(4);
ra.setGrid(2);

let img = ra.loadImage('test/testdata/small-fruit.png');
ra.paste(img);

ra.run();
