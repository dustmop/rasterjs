var assert = require('assert');
var util = require('./util.js');
var ra = require('../src/lib.js');

describe('Render components', function() {
  it('tileset and palette', function() {
    ra.resetState();
    ra.useColors(null);

    let plane = new ra.Plane();
    plane.setSize(4);

    let tiles = ra.loadImage('test/testdata/tiles.png');
    ra.useTileset(tiles, {tile_width: 4, tile_height: 4});
    ra.usePlane(plane);

    plane.fillPattern([[2, 6, 1, 3],
                       [6, 7, 7, 7],
                       [5, 5, 1, 0],
                       [6, 4, 2, 2]]);

    let renderer = ra.renderer;
    renderer.connect(ra.provide());

    let numGot = 0;
    let gotPalette = null;
    let gotTileset = null;
    renderer.renderComponents(['palette', 'tileset'], null, (type, surf) => {
      numGot++;
      if (type == 'palette') {
        gotPalette = surf;
      } else if (type == 'tileset') {
        gotTileset = surf;
      }
    });
    assert.equal(numGot, 2);

    let tmpdir = util.mkTmpDir();
    let tmppal = tmpdir + '/actual-palette.png';
    let tmptiles = tmpdir + '/actual-tileset.png';

    ra._saveSurfacesTo(gotPalette, tmppal);
    ra._saveSurfacesTo(gotTileset, tmptiles);

    util.ensureFilesMatch(tmppal, 'test/testdata/pal_of_tiles.png');
    util.ensureFilesMatch(tmptiles, 'test/testdata/tiles_made.png');
  });
});
