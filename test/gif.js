var assert = require('assert');
var child_process = require('child_process');
var util = require('./util.js');

describe('Gif', function() {
  it('make', function() {
    let tmpdir = util.mkTmpDir();
    let tmpout = tmpdir + '/actual.png';
    let script = 'test/testdata/scripts/spin.js';
    let cmd = `node ${script} --gif ${tmpout} --num-frames 48`;
    let cwd = process.cwd();
    child_process.exec(cmd, function(error, stdout, stderr) {
      if (error) {
        throw error;
      }
      let goldenPath = 'test/testdata/spin.gif';
      assert.ok(util.compareFiles(goldenPath, tmpout));
    });
  });
});
