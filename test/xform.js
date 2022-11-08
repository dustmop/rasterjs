var assert = require('assert');
var util = require('./util.js');
var ra = require('../src/lib.js');

describe('xform', function() {

  it('hflip', function() {
    ra.resetState();

    let img = ra.loadImage('test/testdata/small-fruit.png');
    ra.paste(img);

    let pl = ra.xform('hflip');
    ra.usePlane(pl);

    util.renderCompareTo(ra, 'test/testdata/fruit-hflip.png');
  });

  it('vflip', function() {
    ra.resetState();

    let img = ra.loadImage('test/testdata/small-fruit.png');
    ra.paste(img);

    let pl = ra.xform('vflip');
    ra.usePlane(pl);

    util.renderCompareTo(ra, 'test/testdata/fruit-vflip.png');
  });

  it('modify image with xform', function() {
    ra.resetState();

    let img = ra.loadImage('test/testdata/polygon.png');
    ra.paste(img);

    let pl = ra.select(2, 9, 13, 5);
    let replace = pl.xform('vflip');
    ra.paste(replace, 12, 15);

    util.renderCompareTo(ra, 'test/testdata/mod-scene.png');
  });

});
