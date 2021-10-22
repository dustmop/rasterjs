var assert = require('assert');
var util = require('./util.js');
var ra = require('../src/lib.js');

describe('HSV sort', function() {
  it('default', function() {
    let tmpdir = util.mkTmpDir();
    let tmpout = tmpdir + '/pal.png';
    ra.resetState();

    ra.setZoom(12);
    ra.useColors(null);
    ra.fillTrueBackground(0x40c060);

    // Draw the image, sets the size and color set
    let img = ra.loadImage('test/testdata/dark_sphere.png');
    img.then(function() {
      ra.drawImage(img);

      let pal = ra.getPaletteAll();
      // Compare the palette to expectation
      pal.save(tmpout);
      util.ensureFilesMatch(tmpout, 'test/testdata/pal_sphere.png');

      // Compare the plane data buffer
      let target = ra.clonePlane();
      let data = target.data;
      let pitch = target.pitch;

      let actual = '';
      for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
          let k = y*pitch+x;
          actual += `${data[k]} `;
        }
        actual += '\n';
      }
      let expect = `0 0 0 0 0 0 1 1 1 1 0 0 0 0 0 0 
0 0 0 0 1 1 2 2 2 3 1 1 0 0 0 0 
0 0 0 1 4 2 2 2 2 2 2 3 1 0 0 0 
0 0 1 3 4 2 2 2 2 2 2 2 4 1 0 0 
0 1 3 4 2 2 5 6 2 2 2 2 2 4 1 0 
0 1 3 4 2 2 6 5 6 2 2 2 2 2 1 0 
1 3 4 4 2 2 2 6 2 2 2 2 2 2 4 1 
1 3 4 4 2 2 2 2 2 2 2 2 2 2 2 1 
1 3 3 4 2 2 2 2 2 2 2 2 2 2 4 1 
1 3 3 4 4 2 2 2 2 2 2 2 2 2 4 1 
0 1 3 3 4 4 2 2 2 2 2 2 4 4 1 0 
0 1 3 3 3 4 4 4 2 2 4 4 4 3 1 0 
0 0 1 3 3 3 4 4 4 4 4 3 3 1 0 0 
0 0 0 1 3 3 3 3 3 3 3 3 1 0 0 0 
0 0 0 0 1 1 3 3 3 3 1 1 0 0 0 0 
0 0 0 0 0 0 1 1 1 1 0 0 0 0 0 0 
`;
      assert.equal(expect, actual);

      // Compare the rendered image
      util.saveTmpCompareTo(ra, 'test/testdata/dark_sphere_with_bg.png');
    });

  });

  it('sort when loading', function() {
    let tmpdir = util.mkTmpDir();
    let tmpout = tmpdir + '/pal_sort.png';
    ra.resetState();

    ra.setZoom(12);
    ra.useColors(null);
    ra.fillTrueBackground(0x40c060);

    // Draw the image, sets the size and color set
    let img = ra.loadImage('test/testdata/dark_sphere.png', {sortColors: 'usingHSV'});
    img.then(function() {
      ra.drawImage(img);

      let pal = ra.getPaletteAll();
      // Compare the palette to expectation
      pal.save(tmpout);
      util.ensureFilesMatch(tmpout, 'test/testdata/pal_sphere_sort.png');

      let target = ra.clonePlane();

      // Compare the plane data buffer
      let data = target.data;
      let pitch = target.pitch;
      let actual = '';
      for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
          let k = y*pitch+x;
          actual += `${data[k]} `;
        }
        actual += '\n';
      }
      let expect = `0 0 0 0 0 0 1 1 1 1 0 0 0 0 0 0 
0 0 0 0 1 1 4 4 4 2 1 1 0 0 0 0 
0 0 0 1 3 4 4 4 4 4 4 2 1 0 0 0 
0 0 1 2 3 4 4 4 4 4 4 4 3 1 0 0 
0 1 2 3 4 4 6 5 4 4 4 4 4 3 1 0 
0 1 2 3 4 4 5 6 5 4 4 4 4 4 1 0 
1 2 3 3 4 4 4 5 4 4 4 4 4 4 3 1 
1 2 3 3 4 4 4 4 4 4 4 4 4 4 4 1 
1 2 2 3 4 4 4 4 4 4 4 4 4 4 3 1 
1 2 2 3 3 4 4 4 4 4 4 4 4 4 3 1 
0 1 2 2 3 3 4 4 4 4 4 4 3 3 1 0 
0 1 2 2 2 3 3 3 4 4 3 3 3 2 1 0 
0 0 1 2 2 2 3 3 3 3 3 2 2 1 0 0 
0 0 0 1 2 2 2 2 2 2 2 2 1 0 0 0 
0 0 0 0 1 1 2 2 2 2 1 1 0 0 0 0 
0 0 0 0 0 0 1 1 1 1 0 0 0 0 0 0 
`;
      assert.equal(expect, actual);

      // Compare the rendered image
      util.saveTmpCompareTo(ra, 'test/testdata/dark_sphere_with_bg.png');
    });

  });

  it('sort when getting palette', function() {
    let tmpdir = util.mkTmpDir();
    let tmpout = tmpdir + '/pal_all.png';
    ra.resetState();

    ra.setZoom(12);
    ra.useColors(null);
    ra.fillTrueBackground(0x40c060);

    // Draw the image, sets the size and color set
    let img = ra.loadImage('test/testdata/dark_sphere.png');
    img.then(function() {
      ra.drawImage(img);

      let pal = ra.getPaletteAll({sort: true});
      // Compare the palette to expectation
      pal.save(tmpout);
      util.ensureFilesMatch(tmpout, 'test/testdata/pal_sphere_all.png');

      // Compare the plane data buffer
      let target = ra.clonePlane();
      let data = target.data;
      let pitch = target.pitch;

      let actual = '';
      for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
          let k = y*pitch+x;
          actual += `${data[k]} `;
        }
        actual += '\n';
      }
      let expect = `0 0 0 0 0 0 1 1 1 1 0 0 0 0 0 0 
0 0 0 0 1 1 4 4 4 2 1 1 0 0 0 0 
0 0 0 1 3 4 4 4 4 4 4 2 1 0 0 0 
0 0 1 2 3 4 4 4 4 4 4 4 3 1 0 0 
0 1 2 3 4 4 6 5 4 4 4 4 4 3 1 0 
0 1 2 3 4 4 5 6 5 4 4 4 4 4 1 0 
1 2 3 3 4 4 4 5 4 4 4 4 4 4 3 1 
1 2 3 3 4 4 4 4 4 4 4 4 4 4 4 1 
1 2 2 3 4 4 4 4 4 4 4 4 4 4 3 1 
1 2 2 3 3 4 4 4 4 4 4 4 4 4 3 1 
0 1 2 2 3 3 4 4 4 4 4 4 3 3 1 0 
0 1 2 2 2 3 3 3 4 4 3 3 3 2 1 0 
0 0 1 2 2 2 3 3 3 3 3 2 2 1 0 0 
0 0 0 1 2 2 2 2 2 2 2 2 1 0 0 0 
0 0 0 0 1 1 2 2 2 2 1 1 0 0 0 0 
0 0 0 0 0 0 1 1 1 1 0 0 0 0 0 0 
`;
      assert.equal(expect, actual);

      // Compare the rendered image
      util.saveTmpCompareTo(ra, 'test/testdata/dark_sphere_with_bg.png');
    });

  });

  it('cycle colors', function() {
    let tmpdir = util.mkTmpDir();
    let tmpout = tmpdir + '/pal_cycle.png';
    ra.resetState();

    ra.setZoom(12);
    ra.useColors(null);
    ra.fillTrueBackground(0x40c060);

    // Draw the image, sets the size and color set
    let img = ra.loadImage('test/testdata/dark_sphere.png');
    img.then(function() {
      ra.drawImage(img);

      // Append some colors that will just be used for cycling
      let numBaseColors = ra.numColors();
      let numCycleColors = ra.appendColors([
        0xff0000,
        0xff4000,
        0xff8000,
        0xffc000,
        0xffff00,
        0xffff80,
      ]) - numBaseColors;

      let pal = ra.getPaletteAll({sort: true});

      const skip = 1;
      let cycle = 2;
      for (let i = 0; i < numBaseColors - skip; i++) {
        let p = pal[i + skip];
        pal[i + skip].setColor(numBaseColors + (cycle + i) % numCycleColors);
      }
      util.saveTmpCompareTo(ra, 'test/testdata/cycle_color_sphere0.png');

      cycle = 3;
      for (let i = 0; i < numBaseColors - skip; i++) {
        let p = pal[i + skip];
        pal[i + skip].setColor(numBaseColors + (cycle + i) % numCycleColors);
      }
      util.saveTmpCompareTo(ra, 'test/testdata/cycle_color_sphere1.png');

      let actual = pal.toString();
      let expect = 'PaletteCollection{0:[0]=0x40c060, 1:[10]=0xffc000, 2:[11]=0xffff00, 3:[12]=0xffff80, 4:[7]=0xff0000, 5:[8]=0xff4000, 6:[9]=0xff8000, 7:[11]=0xffff00, 8:[3]=0x231418, 9:[4]=0x2e1d23, 10:[2]=0x34292e, 11:[6]=0x493b43, 12:[5]=0x5b4951}';
      assert.equal(expect, actual);
    });
  });

});
