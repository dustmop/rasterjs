const ra = require('../../../src/lib.js');

ra.resetState();
ra.setZoom(4);

let img = ra.loadImage('test/testdata/small-fruit.png');
ra.drawImage(img);

ra.show();
