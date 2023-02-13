var assert = require('assert');
var child_process = require('child_process');
var util = require('./util.js');

describe('Save', function() {

  it('single frame', function(success) {
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
      success();
    });
  });

  it('multiple frames', function(success) {
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
      success();
    });
  });

  it('late grid', function(success) {
    let tmpdir = util.mkTmpDir();
    let tmpout = tmpdir + '/actual.png';
    let script = 'test/testdata/scripts/late_grid.js';
    let cmd = `node ${script} --save ${tmpout}`;
    let cwd = process.cwd();
    child_process.exec(cmd, function(error, stdout, stderr) {
      if (error) {
        throw error;
      }
      let goldenPath = 'test/testdata/grid-fruit.png';
      util.ensureFilesMatch(goldenPath, tmpout);
      success();
    });
  });

  it('save with zoom', function(success) {
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
      success();
    });
  });

  it('zoom and grid', function(success) {
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
      success();
    });
  });

  it('save animation', function(success) {
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
      success();
    });
  });

  it('save animation tileset swap', function(success) {
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
      success();
    });
  });

  it('save animation scroll layer', function(success) {
    let tmpdir = util.mkTmpDir();
    let tmpout = tmpdir + '/actual.gif';
    let script = 'test/testdata/scripts/move_layers.js';
    let cmd = `node ${script} --save ${tmpout} --num-frames 16`;
    let cwd = process.cwd();
    child_process.exec(cmd, function(error, stdout, stderr) {
      if (error) {
        throw error;
      }
      let goldenPath = 'test/testdata/movelayers.gif';
      util.ensureFilesMatch(goldenPath, tmpout);
      success();
    });
  });

  it('animation with zoom', function(success) {
    let tmpdir = util.mkTmpDir();
    let tmpout = tmpdir + '/actual.gif';
    let script = 'test/testdata/scripts/change_color.js';
    let cmd = `node ${script} --save ${tmpout}`;
    let cwd = process.cwd();
    child_process.exec(cmd, function(error, stdout, stderr) {
      if (error) {
        throw error;
      }
      let goldenPath = 'test/testdata/change-color.gif';
      util.ensureFilesMatch(goldenPath, tmpout);
      success();
    });
  });

  it('multiple layers', function(success) {
    let tmpdir = util.mkTmpDir();
    let tmpout = tmpdir + '/actual.png';
    let script = 'test/testdata/scripts/layer.js';
    let cmd = `node ${script} --save ${tmpout}`;
    let cwd = process.cwd();
    child_process.exec(cmd, function(error, stdout, stderr) {
      if (error) {
        throw error;
      }
      let goldenPath = 'test/testdata/sunset_layers.png';
      assert.ok(util.compareFiles(goldenPath, tmpout), `Failed file comparison, expect: ${goldenPath}, actual: ${tmpout}`);
      success();
    });
  });

  it('tick flag', function(success) {
    let tmpdir = util.mkTmpDir();
    let tmpout = tmpdir + '/actual.png';
    let script = 'test/testdata/scripts/spin.js';
    let cmd = `node ${script} --save ${tmpout} --tick 3`;
    let cwd = process.cwd();
    child_process.exec(cmd, function(error, stdout, stderr) {
      if (error) {
        throw error;
      }
      let goldenPath = 'test/testdata/spin-frame03.png';
      let actual = tmpout;
      assert.ok(util.compareFiles(goldenPath, actual), `Failed file comparison, expect: ${goldenPath}, actual: ${actual}`);
      success();
    });
  });

});
