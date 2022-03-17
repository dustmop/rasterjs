var assert = require('assert');
var ra = require('../src/lib.js');

assert.almostEqual = function(actual, expect, opt) {
  opt = opt || {};
  let epsilon = opt.epsilon || 0.0001;
  let delta = Math.abs(actual - expect);
  if (delta < epsilon) {
    return;
  }
  assert.fail(`expected ${expect}, got ${actual}`);
}

describe('Oscil', function() {
  it('default', function() {
    ra.resetState();
    let n = ra.oscil();
    assert.almostEqual(n, 0.0);
  });
  it('little bit later', function() {
    ra.resetState();
    ra.timeClick = 10;
    let n = ra.oscil();
    assert.almostEqual(n, 0.25);
  });
  it('max', function() {
    ra.resetState();
    ra.timeClick = 10;
    let n = ra.oscil({max: 100});
    assert.almostEqual(n, 25, {epsilon: 0.01});
  });
  it('period', function() {
    ra.resetState();
    ra.timeClick = 10;
    let n = ra.oscil({period: 120});
    assert.almostEqual(n, 0.067);
  });
  it('begin', function() {
    ra.resetState();
    ra.timeClick = 10;
    let n = ra.oscil({begin: 0.5});
    assert.almostEqual(n, 0.75);
  });
  it('click', function() {
    ra.resetState();
    let n = ra.oscil({click: 10});
    assert.almostEqual(n, 0.25);
  });
  it('cannot use positional', function() {
    ra.resetState();
    assert.throws(function() {
      let n = ra.oscil(10);
    }, /cannot pass positional arguments to oscil/);
  });
  it('unrecognized named arg', function() {
    ra.resetState();
    assert.throws(function() {
      let n = ra.oscil({value: 123});
    }, /function oscil unknown parameter value/);
  });
});
