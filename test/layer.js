var util = require('./util.js');
var ra = require('../src/lib.js');

describe('Layers', function() {
  it('two layers', function() {
    ra.resetState();
    ra.setZoom(2);

    let upper = new ra.Plane();
    upper.setSize(16, 16);

    let lower = new ra.Plane();
    lower.setSize(16, 16);

    ra.setSize(16, 16);
    ra.usePlane([lower, upper]);

    // Draw upper plane, dirt on ground.
    upper.fillColor(0);
    upper.setColor(33);
    upper.fillRect({x: 0, y: 11, w: 16, h: 5});
    upper.setColor(17);
    upper.drawLine({x0: 0, y0: 11, x1: 16, y1: 11});
    upper.setColor(25);
    upper.drawLine({x0: 0, y0: 12, x1: 16, y1: 12});
    upper.setColor(9);
    upper.drawDot({x: 1, y: 14});
    upper.drawDot({x: 5, y: 15});
    upper.drawDot({x: 8, y: 13});
    upper.drawDot({x:12, y: 15});

    // Draw lower plane, the sun.
    lower.fillColor(32);
    lower.setColor(42);
    lower.fillCircle({x: 2, y: 2, r: 6});

    util.renderCompareTo(ra, 'test/testdata/sunset_layers.png');
  });

  it('bottom layer can scroll', function() {
    ra.resetState();
    ra.setZoom(2);

    let upper = new ra.Plane();
    upper.setSize(16, 16);

    let lower = new ra.Plane();
    lower.setSize(16, 16);

    ra.setSize(16, 16);
    ra.usePlane([lower, upper]);

    // Draw upper plane, dirt on ground.
    upper.fillColor(0);
    upper.setColor(33);
    upper.fillRect({x: 0, y: 11, w: 16, h: 5});
    upper.setColor(17);
    upper.drawLine({x0: 0, y0: 11, x1: 16, y1: 11});
    upper.setColor(25);
    upper.drawLine({x0: 0, y0: 12, x1: 16, y1: 12});
    upper.setColor(9);
    upper.drawDot({x: 1, y: 14});
    upper.drawDot({x: 5, y: 15});
    upper.drawDot({x: 8, y: 13});
    upper.drawDot({x:12, y: 15});

    // Draw lower plane, the sun.
    lower.fillColor(32);
    lower.setColor(42);
    lower.fillCircle({x: 2, y: 2, r: 6});

    ra.setScrollX(4);
    ra.setScrollY(6);

    util.renderCompareTo(ra, 'test/testdata/sunset_scroll_bottom.png');
  });

  it('top layer can scroll', function() {
    ra.resetState();
    ra.setZoom(2);

    let upper = new ra.Plane();
    upper.setSize(16, 16);

    let lower = new ra.Plane();
    lower.setSize(16, 16);

    ra.setSize(16, 16);
    ra.usePlane([lower, upper]);

    // Draw upper plane, dirt on ground.
    upper.fillColor(0);
    upper.setColor(33);
    upper.fillRect({x: 0, y: 11, w: 16, h: 5});
    upper.setColor(17);
    upper.drawLine({x0: 0, y0: 11, x1: 16, y1: 11});
    upper.setColor(25);
    upper.drawLine({x0: 0, y0: 12, x1: 16, y1: 12});
    upper.setColor(9);
    upper.drawDot({x: 1, y: 14});
    upper.drawDot({x: 5, y: 15});
    upper.drawDot({x: 8, y: 13});
    upper.drawDot({x:12, y: 15});

    // Draw lower plane, the sun.
    lower.fillColor(32);
    lower.setColor(42);
    lower.fillCircle({x: 2, y: 2, r: 6});

    ra.setComponent('camera', 1);
    ra.setScrollX(5);

    util.renderCompareTo(ra, 'test/testdata/sunset_scroll_top.png');
  });

  // TEST: upper plane with scroll (no wrap)
  // TEST: upper plane scroll & interrupt
  // TEST: upper plane using tileset
});
