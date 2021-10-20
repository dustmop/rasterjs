var util = require('./util.js');
var ra = require('../src/lib.js');

describe('Tileset', function() {
  it('renders', function() {
    ra.resetState();

    let plane = new ra.Plane();
    plane.setSize(4);

    let tiles = ra.loadImage('test/testdata/tiles.png');
    ra.useTileset(tiles, {tile_width: 4, tile_height: 4});
    ra.usePlane(plane);

    plane.fillDot([[2, 6, 1, 3],
                   [6, 7, 7, 7],
                   [5, 5, 1, 0],
                   [6, 4, 2, 2]]);

    util.saveTmpCompareTo(ra, 'test/testdata/map_of_tiles.png');
  });
});
