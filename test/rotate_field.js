var util = require('./util.js');
var ra = require('../src/lib.js');

describe('Rotate', function() {
  it('field', function() {
    ra.resetState();

    let imgObj = ra.loadImage('test/testdata/valgrind-obj1.png');
    let rot = ra.rotate(imgObj, 0.5);
    ra.paste(rot);

    util.renderCompareTo(ra, 'test/testdata/valgrind-ship-rotate.png');
  });
});
