var util = require('./util.js');
var ra = require('../src/lib.js');
var algorithm = require('../src/algorithm.js');

describe('Nearest neighbor', function() {
  it('saveTo by integer', function() {
    ra.resetState();

    let img = ra.loadImage('test/testdata/simple.png');
    ra.drawImage(img, 0, 0);

    let resources = ra.scene.resources;

    let res = ra.scene.renderPrimaryPlane();
    let surf = res[0]
    surf = algorithm.nearestNeighbor(surf, 2);

    let tmpdir = util.mkTmpDir();
    let actual = tmpdir + '/actual.png';
    resources.saveTo(actual, [surf]);

    util.ensureFilesMatch(actual, 'test/testdata/simple-times-2.png');
  });
});
