describe('resources', function () {
  it('insert', function(success) {
    let require = window['require'];
    const ra = require('raster');
    ra.resetState();
    let [width, height] = [20, 20];
    let surface = {
      buff: new Uint8ClampedArray(width*height*4),
      pitch: width*4,
      width: width,
      height: height,
    }
    for (let y = 0; y < 20; y++) {
      for (let x = 0; x < 20; x++) {
        let k = (y*20+x)*4;
        if (x < 3 || y < 3 || y >= 17 || x >= 17) {
          surface.buff[k+0] = 0x00;
          surface.buff[k+1] = 0x00;
          surface.buff[k+2] = 0x00;
        } else if ((x == 3 || x == 16) && (y == 3 || y == 16)) {
          surface.buff[k+0] = 0x00;
          surface.buff[k+1] = 0x00;
          surface.buff[k+2] = 0x00;
        } else {
          surface.buff[k+0] = 0x33;
          surface.buff[k+1] = 0xb4;
          surface.buff[k+2] = 0xff;
        }
        surface.buff[k+3] = 0xff;
      }
    }
    ra.insertResource('shape.png', surface);
    let img = ra.loadImage('shape.png');
    ra.paste(img);
    util.renderCompareTo(ra, 'img/spin-frame00.png', success);
  });
});
