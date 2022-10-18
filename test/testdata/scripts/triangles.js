const ra = require('../../../src/lib.js');
ra.setSize({w: 8, h: 8});
ra.setColor(0x21);
ra.fillPolygon([[0,0], [5,0], [0,5]]);
ra.setColor(0x22);
ra.drawPolygon([[7,7], [5,7], [7,5]]);
ra.run();
