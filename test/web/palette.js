describe('palette', function () {
  it('error if image not read', function(success) {
    let require = window['require'];
    let ra = require('raster');
    ra.resetState();
    let img = ra.loadImage('img/fill_clear.png');

    let gotError;
    try {
      let pal = ra.usePalette([0, 1]);
    } catch (e) {
      gotError = e;
    }

    let expectError = 'Error: empty colorMap, wait for images to load';
    if (gotError.toString() != expectError) {
      throw new Error(`failure want: expectError, got: ${gotError}`);
    }
    success();
  });
});
