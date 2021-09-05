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
  ensureFilesMatch(goldenPath, tmpout);
}

function ensureFilesMatch(expectFile, gotFile) {
  if (!compareFiles(expectFile, gotFile)) {
    let e = new Error();
    let lines = e.stack.split('\n');
    let callerLine = lines[2].split(' (')[1].slice(0, -1)
    console.log('');
    console.log(callerLine);
    console.log('mismatch (expect, actual):');
    console.log('open ' + expectFile);
    console.log('open ' + gotFile);
    console.log('');
    console.log('to accept this change:');
    console.log('cp ' + gotFile + ' ' + expectFile);
    console.log('');
  }
  assert.ok(compareFiles(expectFile, gotFile));
}

function skipTest() {
  console.log('--- SKIP ---');
}

module.exports.mkTmpDir = mkTmpDir;
module.exports.compareFiles = compareFiles;
module.exports.saveTmpCompareTo = saveTmpCompareTo;
module.exports.ensureFilesMatch = ensureFilesMatch;
module.exports.skipTest = skipTest;
