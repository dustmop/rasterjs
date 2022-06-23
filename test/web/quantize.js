describe('quantitize', function () {
  it('jpg', function(success) {
    let require = window['require'];
    let ra = require('raster');
    ra.resetState();
    let img = ra.loadImage('img/boss-pic.jpg');
    img.then(function() {
      ra.drawImage(img);
      util.renderCompareTo(ra, 'img/boss-pic-quant2.png', success);
    });
  });
});
