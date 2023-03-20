var assert = require('assert');
var util = require('./util.js');
var ra = require('../src/lib.js');

describe('Tileset Builder', function() {
  it('fill the scene', function() {
    ra.resetState();
    ra.setSize(32, 32);

    ra.setZoom(8);
    ra.setGrid(8);

    ra.drawRect({x: 2, y: 2, w: 25, h: 28});

    util.renderCompareTo(ra, 'test/testdata/rect_outline.png');
  });

  it('build tilesets', function() {
    ra.resetState();

    ra.useDisplay('tileset-builder');
    // TODO: hack to get the test to only render 1 frame
    ra.display._numFrames = 1;

    ra.setSize(32, 32);

    ra.drawRect({x: 2, y: 2, w: 25, h: 28});

    // TODO: Remove the need to call `run`
    ra.run();

    let tileset = ra.display.getTileset();

    let tmpdir = util.mkTmpDir();
    let tmpout = tmpdir + '/actual.png';

    let surfaces = tileset.visualize();
    ra._saveSurfacesTo(surfaces, tmpout);

    util.ensureFilesMatch('test/testdata/made_tileset.png', tmpout);

    let actualData = ra.display.getGraphicsData().frames[0].data;
    let expectData = [0,1,1,2,
                      3,4,4,3,
                      3,4,4,3,
                      5,6,6,7];
    assert.deepEqual(actualData, expectData);
  });

  it('build using ctor', function() {
    ra.resetState();

    let display = new ra.TilesetBuilder({tile_width: 16, tile_height: 16});
    ra.useDisplay(display);
    // TODO: hack to get the test to only render 1 frame
    ra.display._numFrames = 1;

    ra.setSize(32, 32);

    ra.drawRect({x: 2, y: 2, w: 25, h: 28});

    // TODO: Remove the need to call `run`
    ra.run();

    let tileset = display.getTileset();

    let tmpdir = util.mkTmpDir();
    let tmpout = tmpdir + '/actual.png';

    let surfaces = tileset.visualize();
    ra._saveSurfacesTo(surfaces, tmpout);

    util.ensureFilesMatch('test/testdata/made_larger.png', tmpout);

    let actualData = display.getGraphicsData().frames[0].data;
    let expectData = [0,1,2,3];
    assert.deepEqual(actualData, expectData);
  });

});
