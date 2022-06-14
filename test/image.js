var assert = require('assert');
var util = require('./util.js');
var ra = require('../src/lib.js');
var imageLoader = require('../src/image_loader.js');

describe('Image', function() {

  it('load and draw', function() {
    ra.resetState();
    // Black background
    ra.fillColor(0);
    ra.setSize({w: 22, h: 22});

    // Draw an image twice
    let img = ra.loadImage('test/testdata/fill_oscil.png');
    ra.drawImage(img, 2, 10);
    ra.drawImage(img, 12, 4);

    // Draw and crop
    let sheet = ra.loadImage('test/testdata/circle.png');
    let obj = sheet.select(2, 2, 10, 10);
    ra.drawImage(obj, 11, 11);

    util.renderCompareTo(ra, 'test/testdata/composite.png');
  });


  // Drawing an image without setting the size will use that image's size
  it('draw without size', function() {
    ra.resetState();

    let img = ra.loadImage('test/testdata/fill_oscil.png');
    ra.drawImage(img);

    util.renderCompareTo(ra, 'test/testdata/fill_oscil.png');
  });


  // If a colorMap exists, image uses it to convert rgb to 8-bit.
  it('draw using colormap', function() {
    ra.resetState();
    ra.useColors('pico8');

    let img = ra.loadImage('test/testdata/small-fruit.png');
    ra.drawImage(img);

    util.renderCompareTo(ra, 'test/testdata/small-fruit.png');

    // 8-bit data array is using pico8 values
    let expect = new Uint8Array([
      0, 0, 0, 0, 4, 0, 0, 0,
      0, 0, 0, 0, 0, 4, 0, 0,
      0, 2, 8, 8, 8, 4, 2, 0,
      2, 8,14, 8, 4, 8, 8, 2,
      8,14,14, 8, 8, 8, 8, 8,
      8, 8, 8, 8, 8, 8, 8, 8,
      0, 8, 8, 8, 8, 8, 8, 0,
      0, 0, 8, 8, 8, 8, 0, 0
    ]);
    assert.deepEqual(expect, ra.clonePlane().data);
  });


  // Colors that didn't exist in the colorMap are added to it
  it('draw adds colors', function() {
    ra.resetState();
    ra.useColors([0x000000, 0xab5236, 0xff004d, 0x29adff]);

    let img = ra.loadImage('test/testdata/small-fruit.png');
    ra.drawImage(img);

    util.renderCompareTo(ra, 'test/testdata/small-fruit.png');

    let expect = new Uint8Array([
      0, 0, 0, 0, 1, 0, 0, 0,
      0, 0, 0, 0, 0, 1, 0, 0,
      0, 4, 2, 2, 2, 1, 4, 0,
      4, 2, 5, 2, 1, 2, 2, 4,
      2, 5, 5, 2, 2, 2, 2, 2,
      2, 2, 2, 2, 2, 2, 2, 2,
      0, 2, 2, 2, 2, 2, 2, 0,
      0, 0, 2, 2, 2, 2, 0, 0
    ]);
    assert.deepEqual(expect, ra.clonePlane().data);

    // Compare the palette
    let palette = ra.usePalette();
    expect = 'Palette{0:[0]=0x000000, 1:[1]=0xab5236, 2:[2]=0xff004d, 3:[3]=0x29adff, 4:[4]=0x7e2553, 5:[5]=0xff77a8}';
    let actual = palette.toString();
    assert.equal(expect, actual);
  });


  // Draw an image onto a selection
  it('draw on selection', function() {
    ra.resetState();
    ra.useColors('pico8');

    ra.setSize(10, 10);
    ra.fillColor(1);

    let sel = ra.select({x: 1, y: 2, w: 8, h: 6});

    let img = ra.loadImage('test/testdata/small-fruit.png');
    sel.fillColor(2);
    sel.drawImage(img, 1, 2);

    util.renderCompareTo(ra, 'test/testdata/put-select.png');
  });


  // Loading returns an image that knows what colors is uses
  it('loaded image has a look', function() {
    ra.resetState();
    ra.useColors('pico8');

    let img = ra.loadImage('test/testdata/small-fruit.png');
    assert.equal(img.numColors(), 5);
    let expect = new imageLoader.LookAtImage([0, 4, 2, 8, 14], 3)
    assert.deepEqual(img.look, expect);
  });


  // Look object has some functions
  it('look has min and max', function() {
    let look = new imageLoader.LookAtImage([3, 5, 8, 4, 2, 7], 1);
    assert.equal(look.min(), 2);
    assert.equal(look.max(), 8);
    assert.deepEqual(look.toInts(), [3, 5, 8, 4, 2, 7]);
  });


  // Look object tries to determine how many colors appear per row
  it('look density', function() {
    ra.resetState();

    let img = ra.loadImage('test/testdata/fill_oscil.png');
    assert.equal(img.look.density(), 2);

    img = ra.loadImage('test/testdata/odd_filled.png');
    assert.equal(img.look.density(), 3);

    img = ra.loadImage('test/testdata/palette_offs3.png');
    assert.equal(img.look.density(), 8);

    img = ra.loadImage('test/testdata/color_stripes.png');
    assert.equal(img.look.density(), 1);

    img = ra.loadImage('test/testdata/tiles.png');
    assert.equal(img.look.density(), 7);
  });


  // Jpg images cannot be used
  it('jpg cannot be used', function() {
    ra.resetState();
    assert.throws(() => {
      ra.loadImage('test/testdata/small-fruit.jpg');
    }, /only 'png' images supported, couldn't load test\/testdata\/small-fruit.jpg/);
  });


  // Png will too many colors will fail to load
  it('png with too many colors', function() {
    ra.resetState();
    assert.throws(() => {
      ra.loadImage('test/testdata/gradient.png');
    }, /too many colors in image test\/testdata\/gradient.png: 576/);
  });

  // Not found throws an error
  it('not found throws error', function() {
    ra.resetState();
    assert.throws(() => {
      ra.loadImage('test/testdata/not_found.png');
    }, /image not found/);
  });


  // TODO:
  // test palette.constructFrom()

});
