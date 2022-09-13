var assert = require('assert');
var util = require('./util.js');
var ra = require('../src/lib.js');

describe('Fill', function() {
  it('basic', function() {
    ra.resetState();
    ra.setSize({w: 8, h: 8});
    ra.fillFrame(function(x, y) {
      return x + y;
    });
    util.renderCompareTo(ra, 'test/testdata/fill_basic.png');
  });

  it('using oscil', function() {
    ra.resetState();
    ra.setSize({w: 8, h: 8});
    ra.fillFrame(function(x, y) {
      let i = y*ra.width + x;
      if (ra.oscil({period:54, tick:i*76}) > 0.5) {
        return 0x22;
      }
    });
    util.renderCompareTo(ra, 'test/testdata/fill_oscil.png');
  });

  it('callback uses 2 parameters', function() {
    ra.resetState();
    ra.setSize({w: 8, h: 8});
    ra.fillFrame(function(x, y) {
      let i = y*ra.width + x;
      if (ra.oscil({period:54, tick:i*76}) > 0.5) {
        return 0x22;
      }
    });
    util.renderCompareTo(ra, 'test/testdata/fill_oscil.png');
  });

  it('twice, keep contents', function() {
    ra.resetState();
    ra.setSize({w: 8, h: 8});
    // Draw upper left
    ra.fillFrame(function(x, y) {
      if (x + y < 6) {
        return 0x21;
      }
    });
    // A second call to draw lower right
    ra.fillFrame(function(x, y) {
      if (x + y > 11) {
        return 0x22;
      }
    });
    util.renderCompareTo(ra, 'test/testdata/fill_keep.png');
  });

  it ('twice, clear contents', function() {
    ra.resetState();
    ra.setSize({w: 8, h: 8});
    // Draw upper left
    ra.fillFrame(function(x, y) {
      if (x + y < 6) {
        return 0x21;
      }
    });
    // Fill the background
    ra.fillColor(4);
    // A second call to draw lower right
    ra.fillFrame(function(x, y) {
      if (x + y > 11) {
        return 0x22;
      }
    });
    util.renderCompareTo(ra, 'test/testdata/fill_clear.png');
  });

  it ('drawDot to initialize', function() {
    ra.resetState();
    ra.setSize({w: 8, h: 8});
    ra.setColor(8);
    ra.drawDot(0, 7);
    ra.setColor(20);
    ra.drawDot(1, 7);
    ra.fillFrame(function(x, y) {
      return 1 + ra.get(x, (y + 7) % 8);
    });
    util.renderCompareTo(ra, 'test/testdata/fill_draw_dot.png');
  });

  it ('drawLine to initialize', function() {
    ra.resetState();
    ra.setSize({w: 8, h: 8});
    ra.setColor(0x20);
    ra.drawLine(0, 7, 4, 7);
    ra.fillFrame(function(x, y) {
      return 1 + ra.get(x, (y + 7) % 8);
    });
    util.renderCompareTo(ra, 'test/testdata/fill_draw_line.png');
  });

  it ('traverse rowwise', function() {
    ra.resetState();
    ra.setSize({w: 8, h: 4});
    let idx = 0;
    ra.fillFrame({traverse: 'rowwise'}, (x, y) => {
      let n = Math.floor(idx / 8) + 1;
      let m = (idx % 8) + 1;
      idx++;
      return 16 + n + Math.floor(Math.pow(m, n));
    });
    util.renderCompareTo(ra, 'test/testdata/fill_rowwise.png');
  });

  it ('traverse columnar', function() {
    ra.resetState();
    ra.setSize({w: 8, h: 4});
    let idx = 0;
    ra.fillFrame({traverse: 'columnar'}, (x, y) => {
      let n = Math.floor(idx / 8) + 1;
      let m = (idx % 8) + 1;
      idx++;
      return 16 + n + Math.floor(Math.pow(m, n));
    });
    util.renderCompareTo(ra, 'test/testdata/fill_columnar.png');
  });

  it ('unknown key', function() {
    ra.resetState();
    ra.setSize({w: 8, h: 4});
    assert.throws(() => {
      ra.fillFrame({missing: 'error'}, (x, y) => {
      });
    }, /unknown key "missing"/);
  });

  it('buffer update', function() {
    ra.resetState();

    ra.setSize({w: 13, h: 13});
    ra.fillColor(0);

    ra.setColor(7);
    ra.drawLine({x0: 2, y0: 2, x1:  4, y1: 2});
    ra.drawLine({x0: 3, y0: 2, x1:  3, y1: 8});
    ra.drawLine({x0: 2, y0: 9, x1:  9, y1: 9});
    ra.drawLine({x0: 8, y0: 3, x1:  8, y1: 9});
    ra.drawLine({x0: 8, y0: 5, x1: 10, y1: 5});

    ra.fillFrame({buffer: true}, function(x, y) {
      if (ra.get(x, y) == 7) { return null; }
      for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
          if (ra.get(x+i, y+j) == 7) {
            return 37;
          }
        }
      }
    });

    util.renderCompareTo(ra, 'test/testdata/glow_effect.png');
  });

});

function colorClamp(n) {
  if (n < 8) {
    return 0;
  }
  return n;
}
