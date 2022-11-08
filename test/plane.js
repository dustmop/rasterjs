var assert = require('assert');
var util = require('./util.js');
var ra = require('../src/lib.js');

describe('Plane', function() {
  it('fillPattern works', function() {
    let pl = new ra.Plane();
    pl.setSize(4, 4);
    pl.fillPattern([[0,7,7,0],
                    [7,7,0,7],
                    [0,0,0,7],
                    [0,7,7,0],
                   ]);
    let bin = pl.pack();

    let expect = new Uint8Array([
      0, 7, 7, 0,
      7, 7, 0, 7,
      0, 0, 0, 7,
      0, 7, 7, 0,
    ]);
    assert.deepEqual(expect, bin);
  });

  it('fillPattern error', function() {
    let pl = new ra.Plane();
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
    let pl = new ra.Plane();
    pl.setSize(4, 4);
    pl.fill(5);
    let bin = pl.pack();

    let expect = new Uint8Array([
      5, 5, 5, 5,
      5, 5, 5, 5,
      5, 5, 5, 5,
      5, 5, 5, 5,
    ]);
    assert.deepEqual(expect, bin);
  });

  it('fill array', function() {
    let pl = new ra.Plane();
    pl.setSize(4, 4);
    pl.fill([0,7,7,0,
             7,7,0,7,
             0,0,0,7,
             0,7,7,0]);
    let bin = pl.pack();

    let expect = new Uint8Array([
      0, 7, 7, 0,
      7, 7, 0, 7,
      0, 0, 0, 7,
      0, 7, 7, 0,
    ]);
    assert.deepEqual(expect, bin);
  });

  it('fill error', function() {
    let first = new ra.Plane();
    let pl = new ra.Plane();
    pl.setSize(4, 4);
    assert.throws(() => {
      pl.fill(first);
    }, /plane.fill needs array or number, got/);
  });

  it('serialize', function() {
    let pl = new ra.Plane();
    pl.setSize(4, 4);
    pl.fill([0,7,7,0,
             7,7,0,7,
             0,0,0,7,
             0,7,7,0]);
    let actual = pl.serialize();
    let expect = '{"width":4,"height":4,"data":[0,7,7,0,7,7,0,7,0,0,0,7,0,7,7,0]}';
    assert.deepEqual(expect, actual);
  });

});
