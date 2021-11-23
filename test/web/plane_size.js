describe('plane size', function () {
  it('smaller and scroll', function(success) {
    let require = window['require'];
    let ra = require('raster');
    ra.resetState();

    let plane = new ra.Plane();
    plane.setSize(16);
    ra.usePlane(plane);

    plane.setColor(28);
    plane.fillSquare(3, 5, 7);

    ra.setSize(10);
    ra.setScrollX(4);
    ra.setScrollY(2);

    ra.show(null,
            ensureImageMatch('img/scroll_square.png', success));
  });
});
