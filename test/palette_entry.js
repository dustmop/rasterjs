var assert = require('assert');
var util = require('./util.js');
var ra = require('../src/lib.js');
var rgb_map = require('../src/rgb_map.js');

describe('Palette entry', function() {
  it('set color', function() {
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
        result.push(palette.get(i).rgb.toInt());
        i++;
      }
    }

    assert.deepEqual(result, rgb_map.rgb_map_quick);
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

  it('palette as buffer', function() {
    let tmpdir = util.mkTmpDir();
    let tmpout = tmpdir + '/actual.png';
    ra.resetState();

    let palette = ra.usePalette();
    let surfaces = palette.serialize();

    ra._saveSurfacesTo(surfaces, tmpout);

    util.ensureFilesMatch('test/testdata/pal_saved.png', tmpout);
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
      if (palette.get(i).rgb.toInt() != rgb_map.rgb_map_dos[i]) {
        assert.fail('Did not match!');
      }
    }

    let expect = 'Palette{0:[0]=0x000000, 1:[1]=0x0000aa, 2:[2]=0x00aa00, 3:[3]=0x00aaaa, 4:[4]=0xaa0000, 5:[5]=0xaa00aa, 6:[6]=0xaa5500, 7:[7]=0xaaaaaa, 8:[8]=0x555555, 9:[9]=0x5555ff, 10:[10]=0x55ff55, 11:[11]=0x55ffff, 12:[12]=0xff5555, 13:[13]=0xff55ff, 14:[14]=0xffff55, 15:[15]=0xffffff}';
    let actual = palette.toString();
    assert.equal(expect, actual);

    let entry = palette[1];
    assert.equal(entry.toInt(), 170);
  });

  it('get all', function() {
    ra.resetState();
    ra.useColors(null);
    ra.fillTrueColor(0x444444);

    // TODO: Currently, loading the image adds to the colorSet.
    // It should really happen lazily, when the image plane gets
    // applied to the target plane. This means either when the
    // scene's `then` completes, or when the image is drawn.
    let img = ra.loadImage('test/testdata/boss_first_form.png');

    ra.drawImage(img, 0, 0);
    let colors = ra.usePalette({sort: true});
    let actual = [];
    for (let i = 0; i < colors.length; i++) {
      actual.push(colors[i].hex());
    }
    let expect = [
      "0x444444",
      "0x000000",
      "0x4d0e05",
      "0xaaaaaa",
      "0xeaeaea",
      "0xeb0000",
      "0xffbaaf",
      "0x463511",
      "0x8f6a20",
      "0xd3b139",
      "0xf3da94",
      "0x806c8a",
      "0x494349",
      "0x180b0f",
      "0x231418",
      "0x2e1d23",
      "0x34292e",
      "0x493b43",
      "0x5b4951"
    ];
    assert.deepEqual(expect, actual);
  });
});
