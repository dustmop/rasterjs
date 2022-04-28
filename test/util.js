var assert = require('assert');
var os = require('os');
var path = require('path');
var fs = require('fs');
var PNG = require('pngjs').PNG;

function mkTmpDir(targetPath) {
  let tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), 'raster_test_'));
  return tmpdir;
}

function compareFiles(leftFilename, rightFilename) {
  let leftContent = fs.readFileSync(leftFilename);
  let rightContent = fs.readFileSync(rightFilename);
  if (leftFilename.endsWith('.png') && rightFilename.endsWith('.png')) {
    return comparePngContent(leftContent, rightContent);
  }
  return compareBinaryData(leftContent, rightContent);
}

function compareBinaryData(left, right) {
  if (left.length != right.length) {
    return false;
  }
  for (let i = 0; i < left.length; i++) {
    if (left[i] != right[i]) {
      return false;
    }
  }
  return true;
}

function comparePngContent(leftContent, rightContent) {
  let leftImg = PNG.sync.read(leftContent);
  let rightImg = PNG.sync.read(rightContent);
  return compareBinaryData(leftImg.data, rightImg.data);
}

function renderCompareTo(client, goldenPath) {
  let tmpdir = mkTmpDir();
  let tmpout = tmpdir + '/actual.png';
  client.save(tmpout);
  ensureFilesMatch(goldenPath, tmpout);
}

function ensureFilesMatch(expectFile, gotFile) {
  if (!fs.existsSync(expectFile)) {
    let e = new Error();
    let lines = e.stack.split('\n');
    let callerLine;
    try {
      callerLine = lines[3].split(' (')[1].slice(0, -1);
    } catch (e) {
      callerLine = 'Could not locate callsite';
    }
    console.log('');
    console.log(callerLine);
    console.log('file not found ' + expectFile);
    console.log('open ' + gotFile);
    console.log('');
    console.log('to accept this change:');
    console.log('cp ' + gotFile + ' ' + expectFile);
    console.log('');
    assert.fail('FILE MISSING');
  }
  if (!compareFiles(expectFile, gotFile)) {
    let e = new Error();
    let lines = e.stack.split('\n');
    let callerLine;
    try {
      callerLine = lines[2].split(' (')[1].slice(0, -1);
    } catch (e) {
      callerLine = 'Could not locate callsite';
    }
    console.log('');
    console.log(callerLine);
    console.log('mismatch (expect, actual):');
    console.log('open ' + expectFile);
    console.log('open ' + gotFile);
    console.log('');
    console.log('to accept this change:');
    console.log('cp ' + gotFile + ' ' + expectFile);
    assert.fail('FILE DIFFERENCE');
  }
}

function skipTest() {
  console.log('--- SKIP ---');
}

module.exports.mkTmpDir = mkTmpDir;
module.exports.compareFiles = compareFiles;
module.exports.renderCompareTo = renderCompareTo;
module.exports.ensureFilesMatch = ensureFilesMatch;
module.exports.skipTest = skipTest;
