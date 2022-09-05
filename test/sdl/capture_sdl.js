const ra = require('../../src/lib.js');
const util = require('../util.js');
const fs = require('fs');
const PNG = require('pngjs').PNG;

describe('SDL', function() {
  it('capture from window', function() {
    ra.resetState();
    let buff = new Uint8Array(16384);
    if (ra._display.name() != 'sdl') {
      console.log(`
[ERROR]: This test will only pass if raster.js's native
add-on is built with SDL support!
`);
    }
    ra._display.insteadWriteBuffer(buff);

    ra.setZoom(4);
    ra.setGrid(2);

    let img = ra.loadImage('test/testdata/small-fruit.png');
    ra.drawImage(img);

    // Call to `insteadWriteBuffer` means the window will not block
    ra.show();

    let tmpdir = util.mkTmpDir();
    let tmpout = tmpdir + '/capture.png';
    let image = {
      data: buff,
      width: 64,
      height: 64,
    };
    let bytes = PNG.sync.write(image);
    fs.writeFileSync(tmpout, bytes);

    let goldenPath = 'test/testdata/grid-fruit-large.png';
    util.ensureFilesMatch(goldenPath, tmpout);
  });
});
