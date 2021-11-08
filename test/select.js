var util = require('./util.js');
var ra = require('../src/lib.js');

describe('Select', function() {
  it('part of the plane', function() {
    ra.resetState();

    ra.setSize(10);

    ra.fillBackground(25);
    ra.setColor(43);

    let sel = ra.select({x: 1, y: 1, w: 6, h: 6});
    sel.drawRect(1, 2, 7, 4);

    sel.setColor(37);
    sel.fillFlood(3, 3);

    sel.setColor(24);
    sel.drawDot(1, 1);

    util.saveTmpCompareTo(ra, 'test/testdata/selection.png');
  });
});
