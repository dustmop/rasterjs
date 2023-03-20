var ra = require('../src/lib.js');
var util = require('./util.js');

describe('Tiled importer', function() {
  it('example json', function() {
    ra.resetState();

    let importer = new ra.contrib.TiledImporter()
    let res = importer.load('test/testdata/example.json');

    ra.useField(res.field);
    ra.useTileset(res.tileset);

    util.renderCompareTo(ra, 'test/testdata/tiled_example.png');
  });

  it('example xml', function() {
    ra.resetState();

    let importer = new ra.contrib.TiledImporter()
    let res = importer.load('test/testdata/example.tmx');

    ra.useField(res.field);
    ra.useTileset(res.tileset);

    util.renderCompareTo(ra, 'test/testdata/tiled_example.png');
  });
});
