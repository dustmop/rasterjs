var assert = require('assert');
var fs = require('fs');
var os = require('os');
var path = require('path');

var ra = require('../src/lib.js');

function mkTmpDir() {
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

describe('Simple', function() {
  it('draw operations', function() {
    let tmpdir = mkTmpDir();
    let tmpout = tmpdir + '/actual.png';
    ra.resetState();
    // Red background
    ra.fillBackground(0x20);
    ra.setSize({w: 16, h: 16});
    // Green line
    ra.setColor(0x23);
    ra.drawLine(1,1, 6,1);
    // Blue square
    ra.setColor(0x25);
    ra.drawSquare({x: 8, y: 1, size: 4})
    ra.save(tmpout);
    assert.ok(compareFiles('test/testdata/simple.png', tmpout));
  });
});
