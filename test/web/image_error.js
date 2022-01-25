describe('image', function () {
  it('draw', function(success) {
    let require = window['require'];
    let ra = require('raster');
    ra.resetState();
    ra.setSize({w: 12, h: 12});
    let img = ra.loadImage('img/fill_clear.png');
    img.then(function() {
      ra.drawImage(img, 2, 2);
      util.renderCompareTo(ra, 'img/draw_image.png', success);
    });
  });

  it('error if not async', function(success) {
    let require = window['require'];
    let ra = require('raster');
    ra.setSize({w: 12, h: 12});
    let img = ra.loadImage('img/fill_clear.png');
    let gotError = null;
    try {
      ra.drawImage(img, 2, 2);
    } catch(e) {
      gotError = e;
    }
    if (gotError == null) {
      throw 'Failed! Expected to get an error, did not get one'
    }
    let expectError = 'drawImage: image has been opened, but not yet read'
    if (gotError != expectError) {
      throw 'Mismatch!'
    }
    success();
  });
});
