var assert = require('assert');
var util = require('./util.js');
var ra = require('../src/lib.js');

describe('Flood', function() {
  it('maze', function() {
    return util.skipTest();

    ra.resetState();
    ra.setSize({w: 16, h: 16});
    let img = ra.loadImage('test/testdata/maze_mini.png');
    // TODO: drawImage(img) with no x,y should use 0,0
    ra.drawImage(img, 0, 0);
    ra.setColor(37);
    ra.fillFlood({x: 5, y: 7});
    util.saveTmpCompareTo(ra, 'test/testdata/maze_filled.png');
  });

  it('odd shape', function() {
    return util.skipTest();

    ra.resetState();
    ra.setSize({w: 16, h: 16});
    let img = ra.loadImage('test/testdata/odd_shape.png');
    ra.drawImage(img, 0, 0);
    ra.setColor(33);
    ra.fillFlood({x: 8, y: 8});
    util.saveTmpCompareTo(ra, 'test/testdata/odd_filled.png');
  });
});
