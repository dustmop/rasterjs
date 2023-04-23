var util = require('./util.js');
var ra = require('../src/lib.js');
var sprites = require('../src/sprites.js');
var assert = require('assert');

describe('Sprite', function() {
  it('list of objects', function() {
    ra.resetState();

    let imgObj0 = ra.loadImage('test/testdata/valgrind-obj0.png');
    let imgObj1 = ra.loadImage('test/testdata/valgrind-obj1.png');
    let imgObj2 = ra.loadImage('test/testdata/valgrind-obj2.png');
    let imgBg = ra.loadImage('test/testdata/valgrind-bg.png');

    ra.paste(imgBg);

    let sprites = new ra.Spritelist(3, {chardat: [imgObj0, imgObj1, imgObj2]});
    ra.useSpritelist(sprites);

    sprites[0].x = 16;
    sprites[0].y = 48;
    sprites[0].c = 0;

    sprites[1].x = 32;
    sprites[1].y = 8;
    sprites[1].c = 2;

    sprites[2].x = 98;
    sprites[2].y = 66;
    sprites[2].c = 1;

    util.renderCompareTo(ra, 'test/testdata/valgrind-scene.png');
  });

  it('tileset', function() {
    ra.resetState();

    let imgTiles = ra.loadImage('test/testdata/valgrind-tiles.png');
    let imgBg = ra.loadImage('test/testdata/valgrind-bg.png');

    ra.paste(imgBg);

    let tiles = new ra.Tileset({tile_width: 16, tile_height: 16});
    tiles.addFrom(imgTiles);

    let sprites = new ra.Spritelist(4, tiles);
    ra.useSpritelist(sprites);

    sprites[0].x = 16;
    sprites[0].y = 48;
    sprites[0].c = 0;

    sprites[1].x = 32;
    sprites[1].y = 8;
    sprites[1].c = 2;

    sprites[2].x = 98;
    sprites[2].y = 66;
    sprites[2].c = 1;

    sprites[3].x = 98;
    sprites[3].y = 82;
    sprites[3].c = 3;

    util.renderCompareTo(ra, 'test/testdata/valgrind-scene.png');
  });

  it('sheet', function() {
    ra.resetState();

    let imgSheet = ra.loadImage('test/testdata/valgrind-sheet.png');
    let imgBg = ra.loadImage('test/testdata/valgrind-bg.png');

    ra.paste(imgBg);

    let sheet = new ra.SpriteSheet(imgSheet, {trueColorBorder: '#000cd4'});

    let sprites = new ra.Spritelist(3, sheet);
    ra.useSpritelist(sprites);

    sprites[0].x = 16;
    sprites[0].y = 48;
    sprites[0].c = 0;

    sprites[1].x = 32;
    sprites[1].y = 8;
    sprites[1].c = 2;

    sprites[2].x = 98;
    sprites[2].y = 66;
    sprites[2].c = 1;

    util.renderCompareTo(ra, 'test/testdata/valgrind-scene.png');
  });

  it('traceSpriteBorder', function() {
    let rect = {"x":0,"y":0,"r":47,"d":57};
    let border = {"x":3,"y":3,"r":20,"d":20};

    let cases = sprites.buildRecursiveCases(rect, border)
    let expect = [{"d": 20, "r": 2, "x": 0, "y": 4},
                  {"d": 20, "r": 47, "x": 21, "y": 3},
                  {"d": 57, "r": 47, "x": 0, "y": 21}];
    assert.deepEqual(cases, expect);
  });

  it('parseSpritesFromSheetPortion', function() {
    let pl = ra.loadImage('test/testdata/valgrind-sheet.png');

    let res = [];
    let needle = 1;
    let rect = {x:0, y:0, r:pl.width-1, d:pl.height-1};

    sprites.parseSpritesFromSheetPortion(res, pl, needle, rect);

    let expect = [
      {
        "d": 20,
        "r": 20,
        "x": 3,
        "y": 3,
      },
      {
        "d": 37,
        "r": 40,
        "x": 23,
        "y": 4,
      },
      {
        "d": 22,
        "r": 60,
        "x": 43,
        "y": 5,
      },
    ];
    assert.deepEqual(res, expect);
  });

  it('createChar to make sprites', function() {
    ra.resetState();
    ra.setSize(8, 8);
    ra.fillColor(38);

    ra.spritelist.createChar({num: 2, x: 3, y: 3}, (field, i)=> {
      field.setColor(i+40);
      field.fillCircle(0, 0, 1.5);
    });

    ra.spritelist.set(0, {x: 1, y: 0, c: 0});
    ra.spritelist.set(1, {x: 5, y: 4, c: 1});

    util.renderCompareTo(ra, 'test/testdata/some-sprites.png');
  });

  it('behind layer', function() {
    ra.resetState();

    let imgObj = ra.loadImage('test/testdata/small-fruit.png');
    let imgBg = ra.loadImage('test/testdata/letter_e.png');

    ra.paste(imgBg);

    let sprites = new ra.Spritelist(1, {chardat: [imgObj]});
    ra.useSpritelist(sprites);

    sprites[0].x = 4;
    sprites[0].y = 3;
    sprites[0].c = 0;
    sprites[0].b = 0;

    util.renderCompareTo(ra, 'test/testdata/fruit-behind-scene.png');
  });

  it('behind with scroll', function() {
    ra.resetState();

    let imgObj = ra.loadImage('test/testdata/small-fruit.png');
    let imgBg = ra.loadImage('test/testdata/letter_e.png');

    ra.paste(imgBg);
    ra.setScrollX(4);

    let sprites = new ra.Spritelist(1, {chardat: [imgObj]});
    ra.useSpritelist(sprites);

    sprites[0].x = 4;
    sprites[0].y = 3;
    sprites[0].c = 0;
    sprites[0].b = 0;

    util.renderCompareTo(ra, 'test/testdata/behind-scroll-scene.png');
  });

  it('hflip', function() {
    ra.resetState();

    let imgObj = ra.loadImage('test/testdata/small-fruit.png');
    let imgBg = ra.loadImage('test/testdata/letter_e.png');

    ra.paste(imgBg);

    let sprites = new ra.Spritelist(1, {chardat: [imgObj]});
    ra.useSpritelist(sprites);

    sprites[0].x = 4;
    sprites[0].y = 3;
    sprites[0].c = 0;
    sprites[0].h = true;

    util.renderCompareTo(ra, 'test/testdata/fruit-hflip-scene.png');
  });

  it('vflip', function() {
    ra.resetState();

    let imgObj = ra.loadImage('test/testdata/small-fruit.png');
    let imgBg = ra.loadImage('test/testdata/letter_e.png');

    ra.paste(imgBg);

    let sprites = new ra.Spritelist(1, {chardat: [imgObj]});
    ra.useSpritelist(sprites);

    sprites[0].x = 4;
    sprites[0].y = 3;
    sprites[0].c = 0;
    sprites[0].v = true;

    util.renderCompareTo(ra, 'test/testdata/fruit-vflip-scene.png');
  });

  it('both flip', function() {
    ra.resetState();

    let imgObj = ra.loadImage('test/testdata/small-fruit.png');
    let imgBg = ra.loadImage('test/testdata/letter_e.png');

    ra.paste(imgBg);

    let sprites = new ra.Spritelist(1, {chardat: [imgObj]});
    ra.useSpritelist(sprites);

    sprites[0].x = 4;
    sprites[0].y = 3;
    sprites[0].c = 0;
    sprites[0].h = true;
    sprites[0].v = true;

    util.renderCompareTo(ra, 'test/testdata/fruit-both-flip-scene.png');
  });

  it('overlap sprite layering', function() {
    ra.resetState();

    // obj0 is the smaller ship
    let imgObj0 = ra.loadImage('test/testdata/valgrind-obj0.png');
    // obj1 is the longer ship
    let imgObj1 = ra.loadImage('test/testdata/valgrind-obj1.png');

    ra.setSize(24, 36);
    ra.fillColor(0);

    let sprites = new ra.Spritelist(3, {chardat: [imgObj0, imgObj1]});
    ra.useSpritelist(sprites);

    // smaller ship appears at index 0, should appear on top
    sprites[0].x = 1;
    sprites[0].y = 1;
    sprites[0].c = 0;
    // longer ship should appear on the bottom
    sprites[1].x = 0;
    sprites[1].y = 2;
    sprites[1].c = 1;

    util.renderCompareTo(ra, 'test/testdata/overlap-sprites.png');
  });

});
