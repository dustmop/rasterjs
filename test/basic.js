var util = require('./util.js');
var ra = require('../src/lib.js');

describe('Basic', function() {
  it('then draw', function() {
    ra.resetState();
    ra.setSize(16, 16);
    ra.fillColor(0);
    ra.then(function() {
      ra.setColor(28);
      ra.fillSquare({x: 3, y: 5, size: 7});
      util.renderCompareTo(ra, 'test/testdata/green_square.png');
    });
  });

 it('fill color orange', function() {
    ra.resetState();
    ra.setSize(8, 8);
    ra.fillColor(25);
    util.renderCompareTo(ra, 'test/testdata/solid-orange.png');
  });

  it('fill color blue', function() {
    ra.resetState();
    ra.setSize(8, 8);
    ra.fillColor(29);
    util.renderCompareTo(ra, 'test/testdata/solid-blue.png');
  });

});
