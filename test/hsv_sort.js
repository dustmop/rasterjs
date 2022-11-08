var assert = require('assert');
var util = require('./util.js');
var ra = require('../src/lib.js');

describe('HSV sort', function() {
  it('default', function() {
    let tmpdir = util.mkTmpDir();
    let tmpout = tmpdir + '/pal.png';
    ra.resetState();

    ra.setZoom(12);
    ra.usePalette({rgbmap:[]});
    ra.fillTrueColor(0x40c060);

    // Draw the image, sets the size and color map
    let img = ra.loadImage('test/testdata/dark_sphere.png');
    img.then(function() {
      ra.drawImage(img);

      let pal = ra.palette;
      // Compare the palette to expectation
      pal.save(tmpout);
      util.ensureFilesMatch('test/testdata/pal_sphere.png', tmpout);

      // Compare the plane data buffer
      let bin = ra.aPlane.pack();
      let pitch = 16;

      let actual = '';
      for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
          let k = y*pitch+x;
          actual += `${bin[k]} `;
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
    ra.usePalette({rgbmap:[]});
    ra.fillTrueColor(0x40c060);

    // Draw the image, sets the size and color map
    let img = ra.loadImage('test/testdata/dark_sphere.png', {sortColors: 'usingHSV'});
    img.then(function() {
      ra.drawImage(img);

      let pal = ra.palette;
      // Compare the palette to expectation
      pal.save(tmpout);
      util.ensureFilesMatch('test/testdata/pal_sphere_sort.png', tmpout);

      let bin = ra.aPlane.pack();
      let pitch = 16;

      // Compare the plane data buffer
      let actual = '';
      for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
          let k = y*pitch+x;
          actual += `${bin[k]} `;
        }
        actual += '\n';
      }
      let expect = `0 0 0 0 0 0 1 1 1 1 0 0 0 0 0 0 
0 0 0 0 1 1 4 4 4 6 1 1 0 0 0 0 
0 0 0 1 5 4 4 4 4 4 4 6 1 0 0 0 
0 0 1 6 5 4 4 4 4 4 4 4 5 1 0 0 
0 1 6 5 4 4 3 2 4 4 4 4 4 5 1 0 
0 1 6 5 4 4 2 3 2 4 4 4 4 4 1 0 
1 6 5 5 4 4 4 2 4 4 4 4 4 4 5 1 
1 6 5 5 4 4 4 4 4 4 4 4 4 4 4 1 
1 6 6 5 4 4 4 4 4 4 4 4 4 4 5 1 
1 6 6 5 5 4 4 4 4 4 4 4 4 4 5 1 
0 1 6 6 5 5 4 4 4 4 4 4 5 5 1 0 
0 1 6 6 6 5 5 5 4 4 5 5 5 6 1 0 
0 0 1 6 6 6 5 5 5 5 5 6 6 1 0 0 
0 0 0 1 6 6 6 6 6 6 6 6 1 0 0 0 
0 0 0 0 1 1 6 6 6 6 1 1 0 0 0 0 
0 0 0 0 0 0 1 1 1 1 0 0 0 0 0 0 
`;
      assert.equal(expect, actual);

      // Compare the rendered image
      util.renderCompareTo(ra, 'test/testdata/dark_sphere_with_bg.png');
    });

  });

});
