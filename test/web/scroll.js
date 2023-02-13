describe('scroll', function () {
  it('simple', function(success) {
    let require = window['require'];
    let ra = require('raster');
    ra.resetState();
    ra.setSize(16, 16);
    let img = ra.loadImage('img/simple.png');
    img.then(function() {
      ra.paste(img, 0, 0);
      ra.setScrollX(4);
      ra.setScrollY(2);
      util.renderCompareTo(ra, 'img/scroll_simple.png', success);
    });
  });
});
