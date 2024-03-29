var assert = require('assert');
var util = require('./util.js');
var ra = require('../src/lib.js');

describe('Field', function() {
  it('fill circle with destructure', function() {
    let pl = new ra.DrawableField();
    pl.setSize(4, 4);
    pl.setColor(2);
    pl.fillCircle({centerX: 1, centerY: 2, r: 1.5});
    let bin = pl.toArrays();

    let expect = [
      [0, 0, 0, 0],
      [0, 2, 0, 0],
      [2, 2, 2, 0],
      [0, 2, 0, 0],
    ];
    assert.deepEqual(expect, bin);
  });

  it('fillPattern works', function() {
    let pl = new ra.DrawableField();
    pl.setSize(4, 4);
    pl.fillPattern([[0,7,7,0],
                    [7,7,0,7],
                    [0,0,0,7],
                    [0,7,7,0],
                   ]);
    let bin = pl.toArrays();

    let expect = [
      [0, 7, 7, 0],
      [7, 7, 0, 7],
      [0, 0, 0, 7],
      [0, 7, 7, 0],
    ];
    assert.deepEqual(expect, bin);
  });

  it('fillPattern error', function() {
    let pl = new ra.DrawableField();
    pl.setSize(4, 4);
    assert.throws(() => {
      pl.fillPattern([0,7,7,0,
                      7,7,0,7,
                      0,0,0,7,
                      0,7,7,0,
                     ]);
    }, /fillPattern needs a 2d array, got/);
  });

  it('fill number', function() {
    let pl = new ra.Field();
    pl.setSize(4, 4);
    pl.fill(5);
    let bin = pl.toArrays();

    let expect = [
      [5, 5, 5, 5],
      [5, 5, 5, 5],
      [5, 5, 5, 5],
      [5, 5, 5, 5],
    ];
    assert.deepEqual(expect, bin);
  });

  it('fill array', function() {
    let pl = new ra.Field();
    pl.setSize(4, 4);
    pl.fill([0,7,7,0,
             7,7,0,7,
             0,0,0,7,
             0,7,7,0]);
    let bin = pl.toArrays();

    let expect = [
      [0, 7, 7, 0],
      [7, 7, 0, 7],
      [0, 0, 0, 7],
      [0, 7, 7, 0],
    ];
    assert.deepEqual(expect, bin);
  });

  it('fill error', function() {
    let first = new ra.Field();
    let pl = new ra.Field();
    pl.setSize(4, 4);
    assert.throws(() => {
      pl.fill(first);
    }, /field.fill needs array or number, got/);
  });

  it('serialize', function() {
    let pl = new ra.Field();
    pl.setSize(4, 4);
    pl.fill([0,7,7,0,
             7,7,0,7,
             0,0,0,7,
             0,7,7,0]);
    let actual = pl.serialize();
    let expect = '{"width":4,"height":4,"data":[0,7,7,0,7,7,0,7,0,0,0,7,0,7,7,0]}';
    assert.deepEqual(expect, actual);
  });

  it('get and put params cant be null', function() {
    let pl = new ra.Field();
    pl.setSize(4, 4);
    pl.fill([0,4,6,0,
             5,7,2,9,
             0,0,0,3,
             0,1,8,0]);
    assert.equal(pl.get(2, 1), 2);

    assert.throws(() => {
      pl.get(null, 1);
    }, /get: x is null/);

    assert.throws(() => {
      pl.get(2, null);
    }, /get: y is null/);

    assert.throws(() => {
      pl.put(null, 1, 9);
    }, /put: x is null/);

    assert.throws(() => {
      pl.put(2, null, 9);
    }, /put: y is null/);
  });

});
