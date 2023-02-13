var util = require('./util.js');
var ra = require('../src/lib.js');

describe('Layers', function() {
  it('two layers', function() {
    ra.resetState();

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

    // TODO: This method does not perform post-compositing after
    // the renderer creates the layers. Theerefore, this image is
    // only the bottom layer.
    util.renderCompareTo(ra, 'test/testdata/sunset_alone.png');
  });
});
