var assert = require('assert');
var util = require('./util.js');
var destructure = require('../src/destructure.js');

describe('Destructure', function() {
  it('basic params', function() {
    let values = destructure.from('fn0', ['x:i'], [123]);
    assert.deepEqual(values, [123]);
  });
  it('multiple params', function() {
    let values = destructure.from('fn1', ['x:i', 'y:i', 'z:i'],
                                  [123, 456, 789]);
    assert.deepEqual(values, [123, 456, 789]);
  });
  it('named parameters', function() {
    let args = {'x': 123, 'y': 456, 'z': 789};
    let values = destructure.from('fn2', ['x:i', 'y:i', 'z:i'], [args]);
    assert.deepEqual(values, [123, 456, 789]);
  });
  it('too few params', function() {
    assert.throws(function() {
      destructure.from('fn3', ['x:i', 'y:i', 'z:i'], [123, 456]);
    }, /function fn3 expected 3 arguments, got 2/);
  });
  it('too many params', function() {
    assert.throws(function() {
      destructure.from('fn4', ['x:i', 'y:i', 'z:i'], [12, 34, 56, 78]);
    }, /function fn4 expected 3 arguments, got 4/);
  });
  it('extra key', function() {
    assert.throws(function() {
      let args = {'x': 123, 'y': 456, 'z': 789, 'a': 321};
      destructure.from('fn5', ['x:i', 'y:i', 'z:i'], [args]);
    }, /function fn5 unknown parameter a/);
  });
  it('missing key', function() {
    assert.throws(function() {
      let args = {'x': 123, 'y': 456};
      destructure.from('fn6', ['x:i', 'y:i', 'z:i'], [args]);
    }, /function fn6 missing parameter z/);
  });
  it('optional param, missing', function() {
    let values = destructure.from('fn7', ['x:i', 'width?i'], [123]);
    assert.deepEqual(values, [123]);
  });
  it('optional param, given', function() {
    let values = destructure.from('fn8', ['x:i', 'width?i'], [123, 456]);
    assert.deepEqual(values, [123, 456]);
  });
  it('optional options object', function() {
    let values = destructure.from('fn9', ['o?o', 'func:f'], [function(){}]);
    assert(values[0] === null);
    assert(typeof values[1] == 'function');

    values = destructure.from('fn9', ['o?o', 'func:f'], [{a:1}, function(){}]);
    assert.deepEqual(values[0], {a:1});
    assert(typeof values[1] == 'function');
  });
});
