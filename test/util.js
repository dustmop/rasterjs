var assert = require('assert');
var os = require('os');
var path = require('path');
var fs = require('fs');

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

function saveTmpCompareTo(client, goldenPath) {
  let tmpdir = mkTmpDir();
  let tmpout = tmpdir + '/actual.png';
  client.save(tmpout);
  if (!compareFiles(goldenPath, tmpout)) {
    console.log('');
    console.log('open ' + tmpout);
    console.log('');
  }
  assert.ok(compareFiles(goldenPath, tmpout));
}

module.exports.mkTmpDir = mkTmpDir;
module.exports.compareFiles = compareFiles;
module.exports.saveTmpCompareTo = saveTmpCompareTo;
