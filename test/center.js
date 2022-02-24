var util = require('./util.js');
var ra = require('../src/lib.js');

describe('Center', function() {
  it('all drawing', function() {
    ra.resetState();
    ra.setSize({w:54, h:54});
    ra.originAtCenter();

    ra.fillColor(0x00);
    ra.setColor(0x25);

    ra.drawLine(-23, -20, -16, -25);

    let shape = [[-13, -20], [-4, -21], [-6, -10], [-18, -17]];
    ra.fillPolygon(shape);
    ra.drawPolygon(shape, 20, 0);

    ra.fillCircle({x: -23, y: -4, r: 7});
    ra.drawCircle({x:  -5, y: -4, r: 7});

    ra.drawDot(14, 0);

    ra.fillSquare({x: -21, y: 16, size: 7});
    ra.drawSquare({x: -11, y: 16, size: 7});

    ra.fillRect({x: -1, y: 16, w: 9, h: 5});
    ra.drawRect({x: 11, y: 16, w: 9, h: 5});

    util.renderCompareTo(ra, 'test/testdata/draw_all.png');
  });
});
