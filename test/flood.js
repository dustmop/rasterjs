var assert = require('assert');
var util = require('./util.js');
var ra = require('../src/lib.js');

describe('Flood', function() {
  it('maze', function() {
    ra.resetState();
    ra.setSize({w: 16, h: 16});
    ra.useColors('quick');
    let img = ra.loadImage('test/testdata/maze_mini.png');
    ra.drawImage(img);
    ra.setColor(37);
    ra.fillFlood({x: 5, y: 7});
    util.renderCompareTo(ra, 'test/testdata/maze_filled.png');
  });

  it('odd shape', function() {
    ra.resetState();
    ra.setSize({w: 16, h: 16});
    ra.useColors('quick');
    let img = ra.loadImage('test/testdata/odd_shape.png');
    ra.drawImage(img);
    ra.setColor(33);
    ra.fillFlood({x: 8, y: 8});
    util.renderCompareTo(ra, 'test/testdata/odd_filled.png');
  });
});
