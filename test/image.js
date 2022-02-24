var assert = require('assert');
var util = require('./util.js');
var ra = require('../src/lib.js');

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
    let obj = sheet.copy(2, 2, 10, 10);
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


  // If a colorSet exists, image uses it to convert rgb to 8-bit.
  it('draw using colorset', function() {
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


  // Colors that didn't exist in the colorSet are added to it
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
});
