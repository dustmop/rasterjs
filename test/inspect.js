var assert = require('assert');
var util = require('./util.js');
var ra = require('../src/lib.js');

describe('Inspect', function() {

  it('tileset', function() {
    let tmpdir = util.mkTmpDir();
    let tmpout = tmpdir + '/actual.png';
    ra.resetState();
    ra.setSize(128, 128);
    ra.setZoom(4);

    let tiles = ra.loadImage('test/testdata/tiles.png');
    ra.useTileset(tiles, {tile_width: 4, tile_height: 4});

    // Pattern table / Nametable
    let field = new ra.Field();
    field.setSize(4);
    field.fill([2, 6, 1, 3,
                6, 7, 7, 7,
                5, 5, 1, 0,
                6, 4, 2, 2]);
    ra.useField(field);

    let inspect = ra.pixelInspector();

    inspect.lookAt(9, 5, {unit: 'tile'});
    ra.renderPrimaryField();

    assert.equal(inspect.tileID, 7);
    assert.equal(inspect.color, 7);

    inspect.lookAt(9, 5, {unit: 'pixel'});
    ra.renderPrimaryField();

    assert.equal(inspect.tileID, 7);
    assert.equal(inspect.color, 7);

    inspect.lookAt(9, 5, {unit: 'display'});
    ra.renderPrimaryField();

    assert.equal(inspect.tileID, 2);
    assert.equal(inspect.color, 2);
  });

});
