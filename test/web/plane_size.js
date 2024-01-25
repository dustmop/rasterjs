describe('field size', function () {
  it('smaller and scroll', function(success) {
    let require = window['require'];
    let ra = require('raster');
    ra.resetState();

    let field = new ra.DrawableField();
    field.setSize(16, 16);
    ra.useField(field);

    field.setColor(28);
    field.fillSquare(3, 5, 7);

    ra.setSize(10, 10);
    ra.setScrollX(4);
    ra.setScrollY(2);

    util.renderCompareTo(ra, 'img/scroll_square.png', success);
  });
});
