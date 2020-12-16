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

module.exports.mkTmpDir = mkTmpDir;
module.exports.compareFiles = compareFiles;
