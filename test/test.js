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
    ra.fillBackground(0x14);
    ra.setSize({w: 16, h: 16});
    ra.drawLine(1,1, 6,1);
    ra.drawSquare({x: 8, y: 1, size: 4})
    ra.save('tmp/actual.png');
    assert.deepEqual(fs.readFileSync('test/testdata/simple.png'),
                     fs.readFileSync('tmp/actual.png'));
  });
});
