var util = require('./util.js');
var ra = require('../src/lib.js');
var algorithm = require('../src/algorithm.js');

describe('Nearest neighbor', function() {
  it('surface scale by 2', function() {
    ra.resetState();

    let img = ra.loadImage('test/testdata/simple.png');
    ra.drawImage(img, 0, 0);

    let resources = ra.scene.resources;

    let res = ra.scene.renderPrimaryPlane();
    let surf = res[0]
    surf = algorithm.nearestNeighborSurface(surf, 2);

    let tmpdir = util.mkTmpDir();
    let actual = tmpdir + '/actual.png';
    resources.saveTo(actual, [surf]);

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
});
