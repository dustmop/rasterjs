var assert = require('assert');
var util = require('./util.js');
var ra = require('../src/lib.js');

describe('Render components', function() {
  it('render rgbmap', () => {
    ra.resetState();
    ra.usePalette('c64');
    ra.usePalette({entries:[8, 5, 7, 3, 2, 11, 0, 4]});

    let gotPalette, gotRRGMap;

    let renderer = ra._renderer;
    renderer.connect(ra.provide());
    renderer.renderComponents(['palette', 'palette-rgbmap'], null, (type, surf) => {
      if (type == 'palette') {
        gotPalette = surf;
      } else if (type == 'palette-rgbmap') {
        gotRGMap = surf;
      }
    });

    let tmpdir = util.mkTmpDir();
    let tmppal = tmpdir + '/actual-palette.png';
    let tmprgbmap = tmpdir + '/actual-rgbmap.png';

    ra._saveSurfacesTo(gotPalette, tmppal);
    ra._saveSurfacesTo(gotRGMap, tmprgbmap);

    util.ensureFilesMatch('test/testdata/c64-palette.png', tmppal);
    util.ensureFilesMatch('test/testdata/c64-rgbmap.png', tmprgbmap);
  });

  it('tileset and rgbmap', function() {
    ra.resetState();
    ra.usePalette({rgbmap:[]});

    let field = new ra.Field();
    field.setSize(4);

    let tiles = ra.loadImage('test/testdata/tiles.png');
    ra.useTileset(tiles, {tile_width: 4, tile_height: 4});
    ra.useField(field);

    field.fillPattern([[2, 6, 1, 3],
                       [6, 7, 7, 7],
                       [5, 5, 1, 0],
                       [6, 4, 2, 2]]);

    let renderer = ra._renderer;
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
