var util = require('./util.js');
var ra = require('../src/lib.js');

describe('Image', function() {
  it('load and draw', function() {
    return util.skipTest();

    ra.resetState();
    // Black background
    ra.fillBackground(0);
    ra.setSize({w: 22, h: 22});

    // Draw an image twice
    let img = ra.loadImage('test/testdata/fill_oscil.png');
    ra.drawImage(img, 2, 10);
    ra.drawImage(img, 12, 4);

    // Draw and crop
    let sheet = ra.loadImage('test/testdata/circle.png');
    let obj = sheet.copy(2, 2, 10, 10);
    ra.drawImage(obj, 11, 11);

    util.saveTmpCompareTo(ra, 'test/testdata/composite.png');
  });

  it('draw without size', function() {
    return util.skipTest();

    ra.resetState();

    let img = ra.loadImage('test/testdata/fill_oscil.png');
    ra.drawImage(img);

    util.saveTmpCompareTo(ra, 'test/testdata/fill_oscil.png');
  });

});
