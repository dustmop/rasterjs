var assert = require('assert');
var util = require('./util.js');
var ra = require('../src/lib.js');

describe('Fill', function() {
  it('basic', function() {
    ra.resetState();
    ra.setSize({w: 8, h: 8});
    ra.fillFrame(function(mem, x, y) {
      return x + y;
    });
    util.renderCompareTo(ra, 'test/testdata/fill_basic.png');
  });

  it('using oscil', function() {
    ra.resetState();
    ra.setSize({w: 8, h: 8});
    ra.fillFrame(function(mem, x, y) {
      let i = y*mem.pitch + x;
      if (ra.oscil({period:54, click:i*76}) > 0.5) {
        return 0x22;
      }
    });
    util.renderCompareTo(ra, 'test/testdata/fill_oscil.png');
  });

  it('twice, keep contents', function() {
    ra.resetState();
    ra.setSize({w: 8, h: 8});
    // Draw upper left
    ra.fillFrame(function(mem, x, y) {
      if (x + y < 6) {
        return 0x21;
      }
    });
    // A second call to draw lower right
    ra.fillFrame(function(mem, x, y) {
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
    ra.fillFrame(function(mem, x, y) {
      if (x + y < 6) {
        return 0x21;
      }
    });
    // Fill the background
    ra.fillBackground(4);
    // A second call to draw lower right
    ra.fillFrame(function(mem, x, y) {
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
    ra.fillFrame(function(mem, x, y) {
      return 1 + mem.get(x, (y + 7) % 8);
    });
    util.renderCompareTo(ra, 'test/testdata/fill_draw_dot.png');
  });

  it ('drawLine to initialize', function() {
    ra.resetState();
    ra.setSize({w: 8, h: 8});
    ra.setColor(0x20);
    ra.drawLine(0, 7, 4, 7);
    ra.fillFrame(function(mem, x, y) {
      return 1 + mem.get(x, (y + 7) % 8);
    });
    util.renderCompareTo(ra, 'test/testdata/fill_draw_line.png');
  });

  it ('function(mem) with for loops', function() {
    ra.resetState();
    ra.setSize({w: 10, h: 6});
    ra.fillFrame(function(mem) {
      for (let y = 0; y < mem.height; y++) {
        for (let x = 0; x < mem.width; x++) {
          let i = x + y * mem.pitch;
          mem[i] = 16 + y + Math.floor(Math.pow(x+1, y+1));
        }
      }
    });
    util.renderCompareTo(ra, 'test/testdata/fill_for_loop.png');
  });

  it('from previous memory', function() {
    ra.resetState();

    ra.setSize({w: 7, h: 7});
    ra.fillBackground(0);

    ra.fillFrame(function(mem) {
      mem.put(1, 1, 0x30);
      mem.put(1, 5, 0x36);
    });

    let oldA = null;
    let oldB = null;
    let newA = null;
    let newB = null;

    ra.nextFrame();

    ra.fillBackground(0);
    ra.fillFrame({previous: true}, function(mem) {
      oldA = mem.getPrevious(1, 1);
      oldB = mem.getPrevious(1, 5);
      let avg = Math.floor((oldA + oldB) / 2);

      newA = mem.get(1, 1);
      newB = mem.get(1, 5);

      mem.put(1, 1, colorClamp(oldA - 8));
      mem.put(1, 5, colorClamp(oldB - 8));
      mem.put(1, 3, avg);
    });

    util.renderCompareTo(ra, 'test/testdata/fill_prev.png');

    assert.equal(oldA, 0x30);
    assert.equal(newA, 0);
    assert.equal(oldB, 0x36);
    assert.equal(newB, 0);
  });

});

function colorClamp(n) {
  if (n < 8) {
    return 0;
  }
  return n;
}
