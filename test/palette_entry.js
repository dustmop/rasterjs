var assert = require('assert');
var util = require('./util.js');
var ra = require('../src/lib.js');
var rgbColor = require('../src/rgb_color.js');
var rgbMap = require('../src/rgb_map.js');
var palette = require('../src/palette.js');

describe('Palette', function() {
  it('setEntries', () => {
    let pal = new palette.Palette();
    pal.setEntries(4);
    assert.equal(pal.length, 4);
    assert.deepEqual(pal.entriesToInts(), [0, 1, 2, 3]);

    pal.setEntries(7);
    assert.equal(pal.length, 7);
    assert.deepEqual(pal.entriesToInts(), [0, 1, 2, 3, 4, 5, 6]);

    pal.setEntries([1,2,3]);
    assert.equal(pal.length, 3);
    assert.deepEqual(pal.entriesToInts(), [1, 2, 3]);
  });

  it('toString', () => {
    let pal = new palette.Palette();
    pal.setRGBMap([0x000000, 0x010000, 0x020000, 0x030000,
                   0x040000, 0x050000, 0x060000, 0x070000]);

    let actual = pal.toString();
    let expect = `Palette{null}`;
    assert.equal(actual, expect);

    actual = pal.toString({rgbmap: true});
    expect = `Palette.rgbmap{0:0x000000, 1:0x010000, 2:0x020000, 3:0x030000, 4:0x040000, 5:0x050000, 6:0x060000, 7:0x070000}`;
    assert.equal(actual, expect);

    pal.setEntries([0, 4, 3, 6,
                    1, 5, 4, 7,
                    2, 5, 6, 7]);
    actual = pal.toString();
    expect = `Palette{0:[0]=0x000000, 1:[4]=0x040000, 2:[3]=0x030000, 3:[6]=0x060000, 4:[1]=0x010000, 5:[5]=0x050000, 6:[4]=0x040000, 7:[7]=0x070000, 8:[2]=0x020000, 9:[5]=0x050000, 10:[6]=0x060000, 11:[7]=0x070000}`;
    assert.equal(actual, expect);

    actual = pal.toString({pieceSize: 4});
    expect = `Palette{0:[0]=0x000000, 1:[4]=0x040000, 2:[3]=0x030000, 3:[6]=0x060000, 4:[1]=0x010000, 5:[5]=0x050000, 6:[4]=0x040000, 7:[7]=0x070000, 8:[2]=0x020000, 9:[5]=0x050000, 10:[6]=0x060000, 11:[7]=0x070000}`;
    assert.equal(actual, expect);

    actual = pal.toString({rgbmap: true});
    expect = `Palette.rgbmap{0:0x000000, 1:0x010000, 2:0x020000, 3:0x030000, 4:0x040000, 5:0x050000, 6:0x060000, 7:0x070000}`;
    assert.equal(actual, expect);
  });

  it('findNearPieces', () => {
    const pieceSize = 4;

    let pal = new palette.Palette({pieceSize: pieceSize});
    pal.setRGBMap([0x000000, 0x010000, 0x020000, 0x030000,
                   0x040000, 0x050000, 0x060000, 0x070000]);
    pal.setEntries([0, 4, 3, 6,
                    1, 5, 4, 7,
                    2, 5, 6, 7]);

    let match;
    match = pal.findNearPieces([new rgbColor.RGBColor(0x000000),
                                new rgbColor.RGBColor(0x040000),
                                new rgbColor.RGBColor(0x030000)]);
    assert.deepEqual(match,
                     {
                       winners: [0],
                       ranking: [
                         {piece: 1, score: 1}
                       ]
                     });

    match = pal.findNearPieces([new rgbColor.RGBColor(0x010000),
                                new rgbColor.RGBColor(0x050000),
                                new rgbColor.RGBColor(0x070000)]);
    assert.deepEqual(match,
                     {
                       winners: [1],
                       ranking: [
                         {piece: 2, score: 2}
                       ]
                     });

    match = pal.findNearPieces([new rgbColor.RGBColor(0x030000),
                                new rgbColor.RGBColor(0x020000),
                                new rgbColor.RGBColor(0x050000),
                                new rgbColor.RGBColor(0x060000)]);
    assert.deepEqual(match,
                     {
                       winners: [],
                       ranking: [
                         {piece: 2, score: 3},
                         {piece: 0, score: 2},
                         {piece: 1, score: 1},
                       ]
                     });

    match = pal.findNearPieces([new rgbColor.RGBColor(0x060000)]);
    assert.deepEqual(match,
                     {
                       winners: [0, 2],
                       ranking: []
                     });
  });

  it('fill', () => {
    let pal = new palette.Palette();
    pal.setEntries(4);
    pal.fill(6);
    assert.equal(pal.length, 4);
    assert.deepEqual(pal.entriesToInts(), [6, 6, 6, 6]);

    let expect = `Palette{0:[6]=0xc0c0c0, 1:[6]=0xc0c0c0, 2:[6]=0xc0c0c0, 3:[6]=0xc0c0c0}`;
    assert.equal(pal.toString(), expect);
  });

  it('assign', () => {
    let pal = new palette.Palette();
    pal.setEntries(4);
    pal.fill(6);
    pal.assign({1: 3, 3: 7});
    assert.equal(pal.length, 4);
    assert.deepEqual(pal.entriesToInts(), [6, 3, 6, 7]);

    let expect = `Palette{0:[6]=0xc0c0c0, 1:[3]=0x606060, 2:[6]=0xc0c0c0, 3:[7]=0xffffff}`;
    assert.equal(pal.toString(), expect);
  });

  it('entry set color', function() {
    let tmpdir = util.mkTmpDir();
    let tmpout = tmpdir + '/actual.png';
    ra.resetState();

    ra.setSize({w: 14, h: 14});
    ra.fillColor(0);

    let img = ra.loadImage('test/testdata/line.png');
    ra.drawImage(img, 0, 0);

    let entry = ra.eyedrop(8, 4);
    entry.setColor(0x13);

    util.renderCompareTo(ra, 'test/testdata/pal_set.png');
  });

  it('default palette', function() {
    ra.resetState();
    ra.setSize(8, 8);

    let result = [];
    let palette = ra.usePalette();
    let i = 0;
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        ra.setColor(i);
        ra.fillRect({x:x, y:y, w:1, h:1});
        result.push(palette.entry(i).getRGB());
        i++;
      }
    }

    assert.deepEqual(result, rgbMap.rgb_map_quick);
    util.renderCompareTo(ra, 'test/testdata/pal_quick.png');
  });

  it('palette save', function() {
    let tmpdir = util.mkTmpDir();
    let tmpout = tmpdir + '/actual.png';
    ra.resetState();

    let palette = ra.usePalette();
    palette.save(tmpout);

    util.ensureFilesMatch('test/testdata/pal_saved.png', tmpout);
  });

  it('palette image serialization', function() {
    let tmpdir = util.mkTmpDir();
    let tmpout = tmpdir + '/actual.png';
    ra.resetState();

    let palette = ra.usePalette();
    let surfaces = palette.serialize();

    ra._saveSurfacesTo(surfaces, tmpout);

    util.ensureFilesMatch('test/testdata/pal_saved.png', tmpout);
  });

  it('palette.rgbmap image serialization', () => {
    let tmpdir = util.mkTmpDir();
    let tmpout = tmpdir + '/actual.png';
    ra.resetState();

    let palette = ra.usePalette();
    let surfaces = palette.serialize({rgbmap: true});

    ra._saveSurfacesTo(surfaces, tmpout);

    util.ensureFilesMatch('test/testdata/pal_rgbmap_saved.png', tmpout);
  });

  it('palette buffer with options', function() {
    let tmpdir = util.mkTmpDir();
    let tmpout = tmpdir + '/actual.png';
    ra.resetState();

    let palette = ra.usePalette();
    let surfaces = palette.serialize({
      cell_width: 10, cell_height: 7,
      cell_between: 3,
      outer_top: 2, outer_left: 1,
    });

    ra._saveSurfacesTo(surfaces, tmpout);

    util.ensureFilesMatch('test/testdata/custom_pal.png', tmpout);
  });

  it('palette vertical', function() {
    let tmpdir = util.mkTmpDir();
    let tmpout = tmpdir + '/actual.png';
    ra.resetState();
    ra.useColors('nes');

    let palette = ra.usePalette();
    let surfaces = palette.serialize({
      cell_width: 7, cell_height: 19,
      cell_between: 1,
      outer_top: 3, outer_left: 3,
      row_size: 16, text: 'vert',
    });

    ra._saveSurfacesTo(surfaces, tmpout);

    util.ensureFilesMatch('test/testdata/vert_nes.png', tmpout);
  });

  it('palette textless', function() {
    let tmpdir = util.mkTmpDir();
    let tmpout = tmpdir + '/actual.png';
    ra.resetState();
    ra.useColors('nes');

    let palette = ra.usePalette();
    let surfaces = palette.serialize({
      cell_width: 4, cell_height: 4,
      cell_between: 0,
      outer_top: 2, outer_left: 2,
      row_size: 16, text: 'none',
    });

    ra._saveSurfacesTo(surfaces, tmpout);

    util.ensureFilesMatch('test/testdata/textless_nes.png', tmpout);
  });

  it('palette alternate', function() {
    let tmpdir = util.mkTmpDir();
    let tmpout = tmpdir + '/actual.png';
    ra.resetState();
    ra.useColors('dos');

    let palette = ra.usePalette();
    palette.save(tmpout);

    util.ensureFilesMatch('test/testdata/pal_dos_saved.png', tmpout);
  });

  it('palette array', function() {
    let tmpdir = util.mkTmpDir();
    let tmpout = tmpdir + '/actual.png';
    ra.resetState();
    ra.useColors('dos');

    let palette = ra.usePalette();
    for (let i = 0; i < palette.length; i++) {
      if (palette.entry(i).rgb.toInt() != rgbMap.rgb_map_dos[i]) {
        assert.fail('Did not match!');
      }
    }

    let expect = 'Palette{0:[0]=0x000000, 1:[1]=0x0000aa, 2:[2]=0x00aa00, 3:[3]=0x00aaaa, 4:[4]=0xaa0000, 5:[5]=0xaa00aa, 6:[6]=0xaa5500, 7:[7]=0xaaaaaa, 8:[8]=0x555555, 9:[9]=0x5555ff, 10:[10]=0x55ff55, 11:[11]=0x55ffff, 12:[12]=0xff5555, 13:[13]=0xff55ff, 14:[14]=0xffff55, 15:[15]=0xffffff}';
    let actual = palette.toString();
    assert.equal(expect, actual);

    let entry = palette.entry(1);
    assert.equal(entry.getRGB(), 170);
  });

  it('get all', function() {
    ra.resetState();
    ra.useColors(null);
    ra.fillTrueColor(0x444444);

    // loading image adds to the rgbmap
    let img = ra.loadImage('test/testdata/boss_first_form.png');

    ra.drawImage(img, 0, 0);
    let colors = ra.usePalette({sort: true});
    let actual = [];
    for (let i = 0; i < colors.length; i++) {
      actual.push(colors.entry(i).hex());
    }
    let expect = [
      '0x444444',
      '0x000000',
      '0xaaaaaa',
      '0xeaeaea',
      '0xffbaaf',
      '0xf3da94',
      '0x463511',
      '0x8f6a20',
      '0x4d0e05',
      '0xeb0000',
      '0xd3b139',
      '0x494349',
      '0x806c8a',
      '0x493b43',
      '0x5b4951',
      '0x34292e',
      '0x2e1d23',
      '0x231418',
      '0x180b0f'
    ];
    assert.deepEqual(expect, actual);
  });

  it('palette rotation', function() {
    let tmpdir = util.mkTmpDir();
    let tmpout = tmpdir + '/actual.png';
    ra.resetState();
    ra.useColors([0xff0000, 0xff8800, 0xffff00, 0x00ff88,
                  0x00ffff, 0x000088, 0x0000ff, 0x0088ff]);
    let palette = ra.usePalette([1, 0, 3, 2]);
    ra.setSize(8, 8);
    ra.fillFrame(function(x, y) {
      let a = x / 4;
      let b = y / 4;
      if (a < 1 && b < 1) {
        return 0;
      } else if (a >= 1 && b < 1) {
        return 1;
      } else if (a < 1 && b >= 1) {
        return 2;
      } else {
        return 3;
      }
    });
    util.renderCompareTo(ra, 'test/testdata/cycle-before.png');

    palette.cycle({values: [4, 5, 6, 7], tick: 1});
    util.renderCompareTo(ra, 'test/testdata/cycle-after1.png');

    palette.cycle({values: [4, 5, 6, 7], tick: 2});
    util.renderCompareTo(ra, 'test/testdata/cycle-after2.png');

    palette.cycle({values: [4, 5, 6, 7], tick: 3});
    util.renderCompareTo(ra, 'test/testdata/cycle-after3.png');

    palette.cycle({values: [4, 5, 6, 7], tick: 4});
    util.renderCompareTo(ra, 'test/testdata/cycle-colors.png');
  });

  it('palette from image look', function() {
    let tmpdir = util.mkTmpDir();
    let tmpout = tmpdir + '/actual.png';
    ra.resetState();
    ra.useColors('pico8');

    let img = ra.loadImage('test/testdata/green-fruit.png');
    let pal = ra.usePalette(img.look);
    // The pico8 default palette, except only 12 colors, because
    // that's how much the look requires.
    let expect = `Palette{0:[0]=0x000000, 1:[1]=0x1d2b53, 2:[2]=0x7e2553, 3:[3]=0x008751, 4:[4]=0xab5236, 5:[5]=0x5f574f, 6:[6]=0xc2c3c7, 7:[7]=0xfff1e8, 8:[8]=0xff004d, 9:[9]=0xffa300, 10:[10]=0xffec27, 11:[11]=0x00e436}`;
    assert.equal(pal.toString(), expect);
  });

  it('palette cycle using image look', function() {
    let tmpdir = util.mkTmpDir();
    let tmpout = tmpdir + '/actual.png';
    ra.resetState();

    let shape = ra.loadImage('test/testdata/cycle-before.png');
    let cycleColors = ra.loadImage('test/testdata/cycle-colors.png');
    let palette = ra.usePalette({size: 4});

    ra.setSize(8, 8);
    ra.fillFrame(function(x, y) {
      let a = x / 4;
      let b = y / 4;
      if (a < 1 && b < 1) {
        return 0;
      } else if (a >= 1 && b < 1) {
        return 1;
      } else if (a < 1 && b >= 1) {
        return 2;
      } else {
        return 3;
      }
    });

    // Cycle using the set of values from the loaded colormap
    palette.cycle({values: cycleColors.look, incStep: 1, tick: 1});
    util.renderCompareTo(ra, 'test/testdata/cycle-after1.png');

    palette.cycle({values: cycleColors.look, incStep: 1, tick: 2});
    util.renderCompareTo(ra, 'test/testdata/cycle-after2.png');

    palette.cycle({values: cycleColors.look, incStep: 1, tick: 3});
    util.renderCompareTo(ra, 'test/testdata/cycle-after3.png');

    // Cycle using the look as a sequence meant for cycling
    palette.reset();
    palette.cycle(cycleColors.look);
    util.renderCompareTo(ra, 'test/testdata/cycle-look0.png');

    palette.cycle(cycleColors.look, {tick: 1});
    util.renderCompareTo(ra, 'test/testdata/cycle-look1.png');
  });

});
