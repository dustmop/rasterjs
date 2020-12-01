var assert = require('assert');
var fs = require('fs');
var os = require('os');
var path = require('path');

var ra = require('../src/lib.js');

function mkTmpDir(targetPath) {
  let tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), 'raster_test_'));
  console.log('tmpdir = ' + tmpdir);
  return tmpdir;
}

function compareFiles(left, right) {
  let leftFile = fs.readFileSync(left);
  let rightFile = fs.readFileSync(right);
  if (leftFile.length != rightFile.length) {
    return false;
  }
  for (let i = 0; i < leftFile.length; i++) {
    if (leftFile[i] != rightFile[i]) {
      return false;
    }
  }
  return true;
}

describe('Fill', function() {
  it('frame using oscil', function() {
    let tmpdir = mkTmpDir();
    let tmpout = tmpdir + '/actual.png';
    ra.resetState();
    // Small frame
    ra.setSize({w: 8, h: 8});
    // Draw some bits
    ra.fillFrame(function(mem, x, y) {
      let i = y*mem.pitch + x;
      if (ra.oscil(54, undefined, i*76) > 0.5) {
        return 0x22;
      }
    });
    ra.save(tmpout);
    assert.ok(compareFiles('test/testdata/fill_oscil.png', tmpout));
  });
});
