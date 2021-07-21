describe('basic', function () {
  it('draw primitives', function(success) {
    let require = window['require'];
    let ra = require('raster');
    ra.resetState();
    ra.setSize({w: 8, h: 8});
    ra.fillBackground(4);
    ra.setColor(0x22);
    ra.drawDot(7, 5);
    ra.drawDot(5, 7);
    ra.fillRect(6, 6, 2, 2);
    ra.show(null, ensureImageMatch('img/fill_clear.png', success));
  });

  it('more drawing', function(success) {
    let require = window['require'];
    let ra = require('raster');
    ra.resetState();
    ra.setSize({w: 15, h: 15});
    ra.fillBackground(7);
    ra.setColor(0x24);
    ra.drawCircle({x: 1, y: 2, r: 6});
    ra.setColor(0x31);
    ra.fillFlood(5, 6);
    ra.show(null, ensureImageMatch('img/draw_more.png', success));
  });

  it('overflow', function(success) {
    let require = window['require'];
    let ra = require('raster');
    ra.resetState();
    ra.setSize({w: 10, h: 10});
    ra.fillBackground(2);
    ra.setColor(0x1b);
    ra.fillRect({x: 4, y: 6, w: 12, h: 3});
    ra.show(null, ensureImageMatch('img/overflow.png', success));
  });

});
