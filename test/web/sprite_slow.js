describe('sprite slow', function () {
  it('order is preserved', function(success) {
    let require = window['require'];
    let ra = require('raster');
    ra.resetState();

    let imgSheet = ra.loadImage('SLOW:img/valgrind-sheet.png');
    let imgBg = ra.loadImage('img/valgrind-bg.png');

    ra.then(() => {
      ra.paste(imgBg);

      let sheet = new ra.SpriteSheet(imgSheet, {trueColorBorder: '#000cd4'});

      let sprites = new ra.Spritelist(3, sheet);
      ra.useSpritelist(sprites);

      sprites[0].assign({x: 16, y: 48, c: 0});
      sprites[1].assign({x: 32, y:  8, c: 2});
      sprites[2].assign({x: 98, y: 66, c: 1});

      util.renderCompareTo(ra, 'img/valgrind-scene.png', success);
    });
  });
});
