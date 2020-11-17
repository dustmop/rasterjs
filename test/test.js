var assert = require('assert');
var fs = require('fs');
var os = require('os');
var path = require('path');

var ra = require('../src/lib.js');

function mkTmpDirSymlink(targetPath) {
  let tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), 'raster_test_'));
  try {
    fs.unlinkSync(targetPath)
  } catch (e) {
  }
  fs.symlinkSync(tmpdir, targetPath, 'dir');
}

describe('Simple', function() {
  it('draw operations', function() {
    mkTmpDirSymlink('tmp');
    // Red background
    ra.fillBackground(0x20);
    ra.setSize({w: 16, h: 16});
    // Green line
    ra.setColor(0x23);
    ra.drawLine(1,1, 6,1);
    // Blue square
    ra.setColor(0x25);
    ra.drawSquare({x: 8, y: 1, size: 4})
    ra.save('tmp/actual.png');
    assert.deepEqual(fs.readFileSync('test/testdata/simple.png'),
                     fs.readFileSync('tmp/actual.png'));
  });
});
