var assert = require('assert');
var util = require('./util.js');
var ra = require('../src/lib.js');

describe('Cycle palette', function() {

  // Colors used in small-fruit.png, from pico8 colorMap
  //  0x000000  0  black
  //  0x7e2553  2  purple
  //  0xab5236  4  brown
  //  0xff004d  8  red
  //  0xff77a8 14  pink


  // Functionality we want, draw an image then change the palette
  it('change to green', function() {
    ra.resetState();
    ra.useColors('pico8');

    let img = ra.loadImage('test/testdata/small-fruit.png');
    ra.drawImage(img);

    let palette = ra.usePalette();
    palette[2].setColor(3);
    palette[8].setColor(11);
    palette[14].setColor(10);

    util.renderCompareTo(ra, 'test/testdata/green-fruit.png');

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

    // Compare the palette
    palette = ra.usePalette();
    expect = 'Palette{0:[0]=0x000000, 1:[1]=0x1d2b53, 2:[3]=0x008751, 3:[3]=0x008751, 4:[4]=0xab5236, 5:[5]=0x5f574f, 6:[6]=0xc2c3c7, 7:[7]=0xfff1e8, 8:[11]=0x00e436, 9:[9]=0xffa300, 10:[10]=0xffec27, 11:[11]=0x00e436, 12:[12]=0x29adff, 13:[13]=0x83769c, 14:[10]=0xffec27, 15:[15]=0xffccaa}';
    let actual = palette.toString();
    assert.equal(expect, actual);
  });


  it('usePalette must be correct', function() {
    ra.resetState();
    ra.useColors('pico8');
    assert.throws(function() {
      ra.usePalette([16]);
    }, /illegal color value 16, colorMap only has 16/);
  });


  // Image uses color in the colorMap, but not in palette
  it('image uses colors in colorMap, but not in palette', function() {
    ra.resetState();
    ra.useColors('pico8');
    ra.usePalette([8, 0, 2]);

    let img = ra.loadImage('test/testdata/small-fruit.png');
    ra.drawImage(img);

    util.renderCompareTo(ra, 'test/testdata/small-fruit-dramatic.png');
  });


  // Image loaded before palette must agree with it
  it('image loaded before palette is set, needs to agree', function() {
    ra.resetState();
    ra.useColors('pico8');

    let img = ra.loadImage('test/testdata/small-fruit.png');
    ra.drawImage(img);
    ra.usePalette([8, 0, 2, 4, 14]);

    // TODO: The image should be redrawn to agree with the palette.
    util.renderCompareTo(ra, 'test/testdata/small-fruit-agree.png');
  });


  // Image uses color that's not in the colorMap, alias it
  it('palette has available slots', function() {
    ra.resetState();
    ra.useColors([0x000000, // 0 = black
                  0x010101, // 1 = _
                  0x7e2553, // 2 = purple
                  0x030303, // 3 = _
                  0x040404, // 4 = _
                  0x050505, // 5 = _
                  0x060606, // 6 = _
                  0x070707, // 7 = _
                  0xff004d, // 8 = red
                  ]);
    ra.usePalette([8, 0, null, null, 2]);

    let img = ra.loadImage('test/testdata/small-fruit.png');
    ra.drawImage(img);

    util.renderCompareTo(ra, 'test/testdata/rotten-fruit.png');

    let expect = new Uint8Array([
      1, 1, 1, 1, 2, 1, 1, 1,
      1, 1, 1, 1, 1, 2, 1, 1,
      1, 4, 0, 0, 0, 2, 4, 1,
      4, 0, 3, 0, 2, 0, 0, 4,
      0, 3, 3, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0,
      1, 0, 0, 0, 0, 0, 0, 1,
      1, 1, 0, 0, 0, 0, 1, 1
    ]);
    assert.deepEqual(expect, ra.clonePlane().data);

    // Compare the palette, which has aliased color. Dropped rgb is shown in
    // parenthesis.
    palette = ra.usePalette();
    expect = 'Palette{0:[8]=0xff004d, 1:[0]=0x000000, 2:[0]=(0xab5236), 3:[0]=(0xff77a8), 4:[2]=0x7e2553}';
    let actual = palette.toString();
    assert.equal(expect, actual);
  });


  // Draw an image using a pre-defined palette
  it('usePalette packed', function() {
    ra.resetState();
    ra.useColors('pico8');
    ra.usePalette([8, 0, 2, 14, 4]);

    let img = ra.loadImage('test/testdata/small-fruit.png');
    ra.drawImage(img);

    let expect = new Uint8Array([
      1, 1, 1, 1, 4, 1, 1, 1,
      1, 1, 1, 1, 1, 4, 1, 1,
      1, 2, 0, 0, 0, 4, 2, 1,
      2, 0, 3, 0, 4, 0, 0, 2,
      0, 3, 3, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0,
      1, 0, 0, 0, 0, 0, 0, 1,
      1, 1, 0, 0, 0, 0, 1, 1
    ]);
    assert.deepEqual(expect, ra.clonePlane().data);

    // Compare the palette
    palette = ra.usePalette();
    expect = 'Palette{0:[8]=0xff004d, 1:[0]=0x000000, 2:[2]=0x7e2553, 3:[14]=0xff77a8, 4:[4]=0xab5236}';
    let actual = palette.toString();
    assert.equal(expect, actual);
  });

  it('bad palette for image', function() {
    ra.resetState();
    ra.useColors([0x000000, 0xff0000, 0x00ff00, 0x0000ff]);

    // Enable the palette
    let palette = ra.usePalette();

    assert.throws(function() {
      ra.loadImage('test/testdata/small-fruit.png');
    }, /Error: palette exists, and image test\/testdata\/small-fruit.png uses a color not found in the colorMap: RGBColor{#ab5236}/);

  });

});
