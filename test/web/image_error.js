describe('image', function () {
  it('draw', function(success) {
    let require = window['require'];
    let ra = require('raster');
    ra.resetState();
    ra.setSize({w: 12, h: 12});
    ra.fillColor(0);
    let img = ra.loadImage('img/fill_clear.png');
    img.then(function() {
      ra.paste(img, 2, 2);
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
      ra.paste(img, 2, 2);
    } catch(e) {
      gotError = e.message;
    }
    if (gotError == null) {
      throw new Error('Failed! Expected to get an error, did not get one');
    }
    let expectError = 'paste: source has been opened, but not yet read';
    if (gotError != expectError) {
      throw new Error('Mismatch!');
    }
    success();
  });

  it('error not found', function(success) {
    let require = window['require'];
    let ra = require('raster');
    ra.setSize({w: 12, h: 12});
    let img = ra.loadImage('img/not_found.png');

    // Error handler will run because `then` will throw.
    let preserveError = window.onerror;
    window.onerror = function() {
      window.onerror = preserveError;
      success();
    }

    // Wait for images to load, but `not_found` fails to load.
    img.then(function(){
      throw new Error('did not expect callback to happen');
    });
  });
});
