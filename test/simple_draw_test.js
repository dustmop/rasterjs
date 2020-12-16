var assert = require('assert');
var util = require('./util.js');
var ra = require('../src/lib.js');

describe('Simple', function() {
  it('draw operations', function() {
    let tmpdir = util.mkTmpDir();
    let tmpout = tmpdir + '/actual.png';
    ra.resetState();
    // Red background
    ra.fillBackground(0x20);
    ra.setSize({w: 16, h: 16});
    // Green line
    ra.setColor(0x23);
    ra.drawLine(1,1, 6,1);
    // Blue square
    ra.setColor(0x25);
    ra.drawSquare({x: 8, y: 1, size: 4})
    ra.save(tmpout);
    assert.ok(util.compareFiles('test/testdata/simple.png', tmpout));
  });
});
