var assert = require('assert');
var os = require('os');
var path = require('path');
var fs = require('fs');

function mkTmpDir(targetPath) {
  let tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), 'raster_test_'));
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

function saveTmpCompareTo(client, goldenPath) {
  let tmpdir = mkTmpDir();
  let tmpout = tmpdir + '/actual.png';
  client.save(tmpout);
  if (!compareFiles(goldenPath, tmpout)) {
    let e = new Error();
    let lines = e.stack.split('\n');
    let callerLine = lines[2].split(' (')[1].slice(0, -1)
    console.log('');
    console.log(callerLine);
    console.log('mismatch (expect, actual):');
    console.log('open ' + goldenPath);
    console.log('open ' + tmpout);
    console.log('');
    console.log('to accept this change:');
    console.log('cp ' + tmpout + ' ' + goldenPath);
    console.log('');
  }
  assert.ok(compareFiles(goldenPath, tmpout));
}

module.exports.mkTmpDir = mkTmpDir;
module.exports.compareFiles = compareFiles;
module.exports.saveTmpCompareTo = saveTmpCompareTo;
