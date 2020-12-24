var assert = require('assert');
var util = require('./util.js');
var destructure = require('../src/destructure.js');

describe('Destructure', function() {
  it('basic params', function() {
    let values = destructure(['x:i'], ['fn0', [123]]);
    assert.deepEqual(values, [123]);
  });
  it('multiple params', function() {
    let values = destructure(['x:i', 'y:i', 'z:i'], ['fn1', [123, 456, 789]]);
    assert.deepEqual(values, [123, 456, 789]);
  });
  it('named parameters', function() {
    let args = {'x': 123, 'y': 456, 'z': 789};
    let values = destructure(['x:i', 'y:i', 'z:i'], ['fn2', [args]]);
    assert.deepEqual(values, [123, 456, 789]);
  });
  it('too few params', function() {
    assert.throws(function() {
      destructure(['x:i', 'y:i', 'z:i'], ['fn3', [123, 456]]);
    }, /function fn3 expected 3 arguments, got 2/);
  });
  it('too many params', function() {
    assert.throws(function() {
      destructure(['x:i', 'y:i', 'z:i'], ['fn4', [12, 34, 56, 78]]);
    }, /function fn4 expected 3 arguments, got 4/);
  });
  it('extra key', function() {
    assert.throws(function() {
      let args = {'x': 123, 'y': 456, 'z': 789, 'a': 321};
      destructure(['x:i', 'y:i', 'z:i'], ['fn5', [args]]);
    }, /function fn5 unknown parameter a/);
  });
  it('missing key', function() {
    assert.throws(function() {
      let args = {'x': 123, 'y': 456};
      destructure(['x:i', 'y:i', 'z:i'], ['fn6', [args]]);
    }, /function fn6 missing parameter z/);
  });
  it('optional param, missing', function() {
    let values = destructure(['x:i', 'width?i'], ['fn7', [123]]);
    assert.deepEqual(values, [123]);
  });
  it('optional param, given', function() {
    let values = destructure(['x:i', 'width?i'], ['fn8', [123, 456]]);
    assert.deepEqual(values, [123, 456]);
  });
});
