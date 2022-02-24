const ra = require('../../src/lib.js');
const util = require('../util.js');

describe('SDL', function() {
  it('capture from window', function() {
    let tmpdir = util.mkTmpDir();
    let tmpout = tmpdir + '/capture.png';

    ra.resetState();
    ra.scene.display.insteadSaveFile(tmpout);

    ra.setZoom(4);
    ra.setGrid(2);

    let img = ra.loadImage('test/testdata/small-fruit.png');
    ra.drawImage(img);

    // Call to `insteadSaveFile` means the window will not block
    ra.show();

    let goldenPath = 'test/testdata/grid-fruit-large.png';
    util.ensureFilesMatch(goldenPath, tmpout);
  });
});
