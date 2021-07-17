var assert = require('assert');
var child_process = require('child_process');
var util = require('./util.js');

describe('Gif', function() {
  it('save animation', function() {
    let tmpdir = util.mkTmpDir();
    let tmpout = tmpdir + '/actual.gif';
    let script = 'test/testdata/scripts/spin.js';
    let cmd = `node ${script} --save ${tmpout} --num-frames 48`;
    let cwd = process.cwd();
    child_process.exec(cmd, function(error, stdout, stderr) {
      if (error) {
        throw error;
      }
      let goldenPath = 'test/testdata/spin.gif';
      assert.ok(util.compareFiles(goldenPath, tmpout), `Failed file comparison, expect: ${goldenPath}, actual: ${tmpout}`);
    });
  });

  it('save single frame', function() {
    let tmpdir = util.mkTmpDir();
    let tmpout = tmpdir + '/actual.png';
    let script = 'test/testdata/scripts/triangles.js';
    let cmd = `node ${script} --save ${tmpout}`;
    let cwd = process.cwd();
    child_process.exec(cmd, function(error, stdout, stderr) {
      if (error) {
        throw error;
      }
      let goldenPath = 'test/testdata/fill_keep2.png';
      assert.ok(util.compareFiles(goldenPath, tmpout), `Failed file comparison, expect: ${goldenPath}, actual: ${tmpout}`);
    });
  });

});
