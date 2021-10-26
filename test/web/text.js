describe('Text', function() {
  it('write text', function(success) {
    let require = window['require'];
    let ra = require('raster');
    ra.resetState();
    ra.setSize({w: 24, h: 12});
    ra.setFont('asset/romulus.yaff');
    ra.show(function() {
      ra.drawText('abc', 1, 2);
    }, ensureImageMatch('img/abc.png', success));
  });

  it('error if not async', function(success) {
    let require = window['require'];
    let ra = require('raster');
    ra.setSize({w: 24, h: 12});
    ra.setFont('asset/romulus.yaff');
    let gotError = null;
    try {
      ra.drawText('abc', 1, 2);
    } catch(e) {
      gotError = e;
    }
    if (gotError == null) {
      throw 'Failed! Expected to get an error, did not get one'
    }
    let expectError = 'drawText: font has been opened, but not yet read'
    if (gotError != expectError) {
      throw 'Mismatch!'
    }
    success();
  });
});