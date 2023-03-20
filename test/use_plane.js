var assert = require('assert');
var util = require('./util.js');
var ra = require('../src/lib.js');

describe('Use field', function() {
  it('draw to it', function() {
    ra.resetState();

    let field = new ra.Field();
    field.setSize(16, 16);
    ra.useField(field);

    field.setColor(28);
    field.fillSquare(3, 5, 7);

    util.renderCompareTo(ra, 'test/testdata/green_square.png');
  });

  it('set scroll', function() {
    ra.resetState();

    let field = new ra.Field();
    field.setSize(16, 16);
    ra.useField(field);

    field.setColor(28);
    field.fillSquare(3, 5, 7);

    ra.setSize(10, 10);
    ra.setScrollX(4);
    ra.setScrollY(2);

    util.renderCompareTo(ra, 'test/testdata/scroll_square.png');
  });

  it('scroll same field', function() {
    ra.resetState();
    ra.setSize(16, 16);

    let img = ra.loadImage('test/testdata/simple.png');
    ra.paste(img);

    ra.setScrollX(4);
    ra.setScrollY(2);

    util.renderCompareTo(ra, 'test/testdata/scroll_simple.png');
  });

  it('methods can destructure', function() {
    ra.resetState();

    let field = new ra.Field();
    field.setSize(16, 16);
    ra.useField(field);

    field.setColor(28);
    field.fillSquare({x: 3, y: 5, size: 7});

    util.renderCompareTo(ra, 'test/testdata/green_square.png');
  });

  it('ra loses methods', function() {
    ra.resetState();

    let field = new ra.Field();
    field.setSize(16, 16);
    ra.useField(field);

    assert.throws(function() {
      ra.setColor(28);
    }, /the scene does not own a field, because ra.useField was called./);

    assert.throws(function() {
      ra.fillSquare({x: 3, y: 5, size: 7});
    }, /the scene does not own a field, because ra.useField was called./);
  });

});
