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
    ra.fillTrueColor(0x40c060);

    // Draw the image, sets the size and color map
    let img = ra.loadImage('test/testdata/dark_sphere.png');
    img.then(function() {
      ra.drawImage(img);

      let pal = ra.usePalette();
      // Compare the palette to expectation
      pal.save(tmpout);
      util.ensureFilesMatch('test/testdata/pal_sphere.png', tmpout);

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
      util.renderCompareTo(ra, 'test/testdata/dark_sphere_with_bg.png');
    });

  });

  it('sort when loading', function() {
    let tmpdir = util.mkTmpDir();
    let tmpout = tmpdir + '/pal_sort.png';
    ra.resetState();

    ra.setZoom(12);
    ra.useColors(null);
    ra.fillTrueColor(0x40c060);

    // Draw the image, sets the size and color map
    let img = ra.loadImage('test/testdata/dark_sphere.png', {sortColors: 'usingHSV'});
    img.then(function() {
      ra.drawImage(img);

      let pal = ra.usePalette();
      // Compare the palette to expectation
      pal.save(tmpout);
      util.ensureFilesMatch('test/testdata/pal_sphere_sort.png', tmpout);

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
      util.renderCompareTo(ra, 'test/testdata/dark_sphere_with_bg.png');
    });

  });

  it('sort when getting palette', function() {
    let tmpdir = util.mkTmpDir();
    let tmpout = tmpdir + '/pal_all.png';
    ra.resetState();

    ra.setZoom(12);
    ra.useColors(null);
    ra.fillTrueColor(0x40c060);

    // Draw the image, sets the size and color map
    let img = ra.loadImage('test/testdata/dark_sphere.png');
    img.then(function() {
      ra.drawImage(img);

      let pal = ra.usePalette({sort: true});
      // Compare the palette to expectation
      pal.save(tmpout);
      util.ensureFilesMatch('test/testdata/pal_sphere_all.png', tmpout);

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
      util.renderCompareTo(ra, 'test/testdata/dark_sphere_with_bg.png');
    });

  });
});
