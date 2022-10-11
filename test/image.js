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
    ra.usePalette('pico8');

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
    ra.usePalette({rgbmap:[0x000000, 0xab5236, 0xff004d, 0x29adff]});

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
    let palette = ra.palette;
    expect = 'Palette{0:[0]=0x000000, 1:[1]=0xab5236, 2:[2]=0xff004d, 3:[3]=0x29adff, 4:[4]=0x7e2553, 5:[5]=0xff77a8}';
    let actual = palette.toString();
    assert.equal(expect, actual);
  });


  // Draw an image onto a selection
  it('draw on selection', function() {
    ra.resetState();
    ra.usePalette('pico8');

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
    ra.usePalette('pico8');

    let img = ra.loadImage('test/testdata/small-fruit.png');
    assert.equal(img.numColors(), 5);
    let expect = new imageLoader.LookOfImage([0, 4, 2, 8, 14], 3)
    assert.deepEqual(img.look, expect);
  });


  // Look object has some functions
  it('look has min and max', function() {
    let look = new imageLoader.LookOfImage([3, 5, 8, 4, 2, 7], 1);
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


  // Jpg images
  it('jpg is down sampled', function() {
    ra.resetState();
    let img = ra.loadImage('test/testdata/small-fruit.jpg');
    ra.drawImage(img);

    util.renderCompareTo(ra, 'test/testdata/small-fruit-quant.png');

    // 8-bit data array is using pico8 values
    let expect = new Uint8Array([
       1, 1,39, 1, 3,32,27,38,
       0,30,36,28,31, 5,40,26,
      37,42, 9,14, 7, 4,45,35,
      43,54,58,21,24,55,19,44,
      17,57,59,50,15,18,46,22,
      53, 6,56,48,47, 8,13,16,
      41,51,20,10,17,18,52,34,
      25,29,12,11,23,49,33, 2,
    ]);
    assert.deepEqual(expect, ra.clonePlane().data);
  });


  it('jpg boss pic', function() {
    ra.resetState();
    let img = ra.loadImage('test/testdata/boss-pic.jpg');
    ra.drawImage(img);
    util.renderCompareTo(ra, 'test/testdata/boss-pic-quant.png');
  });


  it('jpg magma spawn', function() {
    ra.resetState();
    let img = ra.loadImage('test/testdata/magma-spawn.jpg');
    ra.drawImage(img);
    util.renderCompareTo(ra, 'test/testdata/magma-spawn-quant.png');
  });


  it('jpg firefly suit', function() {
    ra.resetState();
    let img = ra.loadImage('test/testdata/firefly-suit.jpg');
    ra.drawImage(img);
    util.renderCompareTo(ra, 'test/testdata/firefly-suit-quant.png');
  });


  it('jpg space invader', function() {
    ra.resetState();
    let img = ra.loadImage('test/testdata/space-invader.jpg');
    ra.drawImage(img);
    util.renderCompareTo(ra, 'test/testdata/space-invader-quant.png');
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


  it('draw async', function(success) {
    ra.resetState();
    ra.setSize({w: 12, h: 12});
    ra.fillColor(0);
    let img = ra.loadImage('test/testdata/fill_clear.png', {async: true});
    img.then(function() {
      ra.drawImage(img, 2, 2);
      util.renderCompareTo(ra, 'test/testdata/draw_image.png', success);
      success();
    });
  });


  it('error if not async', function(success) {
    ra.resetState();
    ra.setSize({w: 12, h: 12});
    let img = ra.loadImage('test/testdata/fill_clear.png', {async: true});
    let gotError = null;
    try {
      ra.drawImage(img, 2, 2);
    } catch(e) {
      gotError = e.message;
    }
    if (gotError == null) {
      throw new Error('Failed! Expected to get an error, did not get one');
    }
    let expectError = 'drawImage: image has been opened, but not yet read';
    if (gotError != expectError) {
      throw new Error('Mismatch!');
    }
    success();
  });


  it('select and draw', function() {
    ra.resetState();
    ra.usePalette('quick');

    let img = ra.loadImage('test/testdata/draw_all.png');
    ra.drawImage(img);

    // get just the square
    let squareSelect = ra.select({x: 16, y: 43, w: 7, h: 7});
    assert.equal(squareSelect.get(0, 0), 0x25);
    assert.equal(squareSelect.get(1, 1), 0);

    squareSelect.put(2, 2, 0x25);
    ra.drawImage(squareSelect, 0, 0);
    ra.drawImage(squareSelect, 25, 15);

    let insideCircleTarget = ra.select({x: 25, y: 25, w: 8, h: 5});
    insideCircleTarget.drawImage(squareSelect, 1, 1);

    util.renderCompareTo(ra, 'test/testdata/draw_copied.png');
  });

});
