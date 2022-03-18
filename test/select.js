var util = require('./util.js');
var ra = require('../src/lib.js');

describe('Select', function() {
  it('part of the plane', function() {
    ra.resetState();

    ra.setSize(10);

    ra.fillColor(25);
    ra.setColor(43);

    let sel = ra.select({x: 1, y: 1, w: 6, h: 6});
    sel.drawRect(1, 2, 7, 4);

    sel.setColor(37);
    sel.fillFlood(3, 3);

    sel.setColor(24);
    sel.drawDot(1, 1);

    util.renderCompareTo(ra, 'test/testdata/selection.png');
  });

  it('uses destructure for methods', function() {
    ra.resetState();

    ra.setSize(10);

    ra.fillColor(25);
    ra.setColor(43);

    let sel = ra.select({x: 1, y: 1, w: 6, h: 6});
    sel.drawRect({x:1, y:2, w:7, h:4});

    sel.setColor(37);
    sel.fillFlood(3, 3);

    sel.setColor(24);
    sel.drawDot(1, 1);

    util.renderCompareTo(ra, 'test/testdata/selection.png');
  });

  it('can be called on selections', function() {
    ra.resetState();

    ra.setSize(8);
    ra.setZoom(20);

    ra.fillColor(4); // grey

    ra.setColor(27); // green
    ra.fillRect(0, 0, 100, 100);

    let middle = ra.select({x: 2, y: 1, w: 4, h: 6});
    middle.setColor(25); // orange
    middle.fillRect(0, 0, 100, 100);

    let inner = middle.select({x: 1, y: 1, w: 2, h: 4});
    inner.setColor(30); // purple
    inner.fillRect(0, 0, 100, 100);

    let left = inner.select({x: 0, y: 1, w: 1, h: 1});
    left.setColor(42); // yellow
    left.fillRect(0, 0, 100, 100);

    let right = inner.select({x: 1, y: 2, w: 1, h: 1});
    right.setColor(45); // blue
    right.fillRect(0, 0, 100, 100);

    util.renderCompareTo(ra, 'test/testdata/select_on_select.png');
  });

  it('works with fillColor', function() {
    ra.resetState();

    ra.setSize(16);
    ra.fillColor(0);

    let sel = ra.select({x: 3, y: 5, w: 7, h: 7});
    sel.fillColor(28);

    util.renderCompareTo(ra, 'test/testdata/green_square.png');
  });

});
