var assert = require('assert');
var child_process = require('child_process');
var util = require('./util.js');

describe('Gif', function() {
  it('save animation', function() {
    let tmpdir = util.mkTmpDir();
    let tmpout = tmpdir + '/actual.gif';
    let script = 'test/testdata/scripts/spin.js';
    let cmd = `node ${script} --save ${tmpout} --num-frames 45`;
    let cwd = process.cwd();
    child_process.exec(cmd, function(error, stdout, stderr) {
      if (error) {
        throw error;
      }
      let goldenPath = 'test/testdata/spin.gif';
      util.ensureFilesMatch(goldenPath, tmpout);
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
      let goldenPath = 'test/testdata/fill_keep.png';
      assert.ok(util.compareFiles(goldenPath, tmpout), `Failed file comparison, expect: ${goldenPath}, actual: ${tmpout}`);
    });
  });

  it('save multiple frames', function() {
    let tmpdir = util.mkTmpDir();
    let tmpout = tmpdir + '/actual%02d.png';
    let script = 'test/testdata/scripts/spin.js';
    let cmd = `node ${script} --save ${tmpout} --num-frames 4`;
    let cwd = process.cwd();
    child_process.exec(cmd, function(error, stdout, stderr) {
      if (error) {
        throw error;
      }
      let goldenPath = 'test/testdata/spin-frame00.png';
      let actual = tmpdir + '/actual00.png';
      assert.ok(util.compareFiles(goldenPath, actual), `Failed file comparison, expect: ${goldenPath}, actual: ${actual}`);
      goldenPath = 'test/testdata/spin-frame03.png';
      actual = tmpdir + '/actual03.png';
      assert.ok(util.compareFiles(goldenPath, actual), `Failed file comparison, expect: ${goldenPath}, actual: ${actual}`);
    });
  });

  it('save animation tileset swap', function() {
    let tmpdir = util.mkTmpDir();
    let tmpout = tmpdir + '/actual.gif';
    let script = 'test/testdata/scripts/animtile.js';
    let cmd = `node ${script} --save ${tmpout} --num-frames 16`;
    let cwd = process.cwd();
    child_process.exec(cmd, function(error, stdout, stderr) {
      if (error) {
        throw error;
      }
      let goldenPath = 'test/testdata/animtile.gif';
      util.ensureFilesMatch(goldenPath, tmpout);
    });
  });

  it('save with zoom', function() {
    let tmpdir = util.mkTmpDir();
    let tmpout = tmpdir + '/actual.png';
    let script = 'test/testdata/scripts/zoom_fruit.js';
    let cmd = `node ${script} --save ${tmpout}`;
    let cwd = process.cwd();
    child_process.exec(cmd, function(error, stdout, stderr) {
      if (error) {
        throw error;
      }
      let goldenPath = 'test/testdata/big-fruit.png';
      util.ensureFilesMatch(goldenPath, tmpout);
    });
  });

  it('zoom and grid', function() {
    let tmpdir = util.mkTmpDir();
    let tmpout = tmpdir + '/actual.png';
    let script = 'test/testdata/scripts/grid_fruit.js';
    let cmd = `node ${script} --save ${tmpout}`;
    let cwd = process.cwd();
    child_process.exec(cmd, function(error, stdout, stderr) {
      if (error) {
        throw error;
      }
      let goldenPath = 'test/testdata/grid-fruit.png';
      util.ensureFilesMatch(goldenPath, tmpout);
    });
  });

  it('show with callback', function() {
    let tmpdir = util.mkTmpDir();
    let tmpout = tmpdir + '/actual.png';
    let script = 'test/testdata/scripts/show_with_callback.js';
    let cmd = `node ${script} --save ${tmpout}`;
    let cwd = process.cwd();
    child_process.exec(cmd, function(error, stdout, stderr) {
      if (error) {
        throw error;
      }
      let goldenPath = 'test/testdata/spin-frame00.png';
      util.ensureFilesMatch(goldenPath, tmpout);
    });
  });

  it('showFrame', function() {
    let tmpdir = util.mkTmpDir();
    let tmpout = tmpdir + '/actual.png';
    let script = 'test/testdata/scripts/show_frame.js';
    let cmd = `node ${script} --save ${tmpout}`;
    let cwd = process.cwd();
    child_process.exec(cmd, function(error, stdout, stderr) {
      if (error) {
        throw error;
      }
      let goldenPath = 'test/testdata/palette_offs3.png';
      util.ensureFilesMatch(goldenPath, tmpout);
    });
  });

});
