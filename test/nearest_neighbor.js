var util = require('./util.js');
var ra = require('../src/lib.js');
var algorithm = require('../src/algorithm.js');

describe('Nearest neighbor', function() {
  it('surface scale by 2', function() {
    ra.resetState();

    let img = ra.loadImage('test/testdata/simple.png');
    ra.drawImage(img, 0, 0);

    let res = ra.renderPrimaryPlane();
    let surf = res[0]
    surf = algorithm.nearestNeighborSurface(surf, 2);

    let tmpdir = util.mkTmpDir();
    let actual = tmpdir + '/actual.png';
    ra._saveSurfacesTo([surf], actual);

    util.ensureFilesMatch(actual, 'test/testdata/simple-times-2.png');
  });

  it('plane scale by 2', function() {
    ra.resetState();

    let img = ra.loadImage('test/testdata/simple.png');
    ra.drawImage(img, 0, 0);

    let upscale = ra.resize(32, 32);
    ra.usePlane(upscale);

    util.renderCompareTo(ra, 'test/testdata/simple-times-2.png');
  });

  it('plane upscale', function() {
    ra.resetState();

    let img = ra.loadImage('test/testdata/simple.png');
    ra.drawImage(img, 0, 0);

    let upscale = ra.resize(29, 33);
    ra.usePlane(upscale);

    util.renderCompareTo(ra, 'test/testdata/simple-upscale.png');
  });

  it('plane downscale', function() {
    ra.resetState();

    let img = ra.loadImage('test/testdata/simple.png');
    ra.drawImage(img, 0, 0);

    let upscale = ra.resize(13, 11);
    ra.usePlane(upscale);

    util.renderCompareTo(ra, 'test/testdata/simple-downscale.png');
  });

});
