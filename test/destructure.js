var assert = require('assert');
var util = require('./util.js');
var destructure = require('../src/destructure.js');

describe('Destructure', function() {

  it('build simple', function() {
    let patterns = destructure.build(['x:i']);
    let expect = new destructure.DescribeSpec();
    expect.allowPositional = true;
    expect.choices = [
      {
        mapping: {
          x: 0
        },
        needed: 1,
        row: [
          {
            def: null,
            name: 'x',
            req: true,
            type: 'i'
          }
        ]
      }
    ];
    assert.deepEqual(patterns, expect);
  });
  it('build named params', function() {
    let patterns = destructure.build(['!name', 'period?i=60', 'begin?n']);
    let expect = new destructure.DescribeSpec();
    expect.allowPositional = false;
    expect.choices = [
      {
        mapping: {
          begin: 1,
          period: 0
        },
        needed: 0,
        row: [
          {
            def: 60,
            name: 'period',
            req: false,
            type: 'i'
          },
          {
            def: undefined,
            name: 'begin',
            req: false,
            type: 'n'
          }
        ]
      }
    ];
    assert.deepEqual(patterns, expect);
  });

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
    let args = [{'x': 123, 'y': 456, 'z': 789}];
    let values = destructure.from('fn2', ['x:i', 'y:i', 'z:i'], args);
    assert.deepEqual(values, [123, 456, 789]);
  });
  it('too few params', function() {
    assert.throws(function() {
      destructure.from('fn3', ['x:i', 'y:i', 'z:i'], [123, 456]);
    }, /function 'fn3' expected 3 arguments, got 2/);
  });
  it('too many params', function() {
    assert.throws(function() {
      destructure.from('fn4', ['x:i', 'y:i', 'z:i'], [12, 34, 56, 78]);
    }, /function 'fn4' expected 3 arguments, got 4/);
  });
  it('extra key', function() {
    assert.throws(function() {
      let args = [{'x': 123, 'y': 456, 'z': 789, 'a': 321}];
      destructure.from('fn5', ['x:i', 'y:i', 'z:i'], args);
    }, /function 'fn5' unknown parameter a/);
  });
  it('missing key', function() {
    assert.throws(function() {
      let args = [{'x': 123, 'y': 456}];
      destructure.from('fn6', ['x:i', 'y:i', 'z:i'], args);
    }, /function 'fn6' missing parameter z/);
  });
  it('optional param, missing', function() {
    let values = destructure.from('fn7', ['x:i', 'width?i'], [123]);
    assert.deepEqual(values, [123]);
  });
  it('optional param, given', function() {
    let values = destructure.from('fn8', ['x:i', 'width?i'], [123, 456]);
    assert.deepEqual(values, [123, 456]);
  });
  it('second named parameters', function() {
    let args = [{'y': 456}];
    let values = destructure.from('fn2', ['x?i', 'y?i', 'z?i'], args);
    assert.deepEqual(values, [0, 456, 0]);
  });
  it('third named parameters', function() {
    let args = [{'z': 789}];
    let values = destructure.from('fn2', ['x?i', 'y?i', 'z?i'], args);
    assert.deepEqual(values, [0, 0, 789]);
  });
  it('optional options object', function() {
    let values = destructure.from('fn9', ['o?o', 'func:f'], [function(){}]);
    assert(values[0] === null);
    assert(typeof values[1] == 'function');

    values = destructure.from('fn9', ['o?o', 'func:f'], [{a:1}, function(){}]);
    assert.deepEqual(values[0], {a:1});
    assert(typeof values[1] == 'function');
  });
  it('convert to int or number', function() {
    let values = destructure.from('fn1', ['w:i', 'x:i', 'y:n', 'z:n'],
                                  [123.4, '456.7', 789.1, '234.5']);
    assert.deepEqual(values, [123, 456, 789.1, 234.5]);
  });
  it('convert to string', function() {
    let values = destructure.from('fn1', ['x:s', 'y:s', 'z:s'],
                                  [123, 456.7, '789']);
    assert.deepEqual(values, ['123', '456.7', '789']);
  });
  it('default values', function() {
    let values = destructure.from('fn1', ['x?i=1', 'y?n=2.3', 'z?s=hi'],
                                  [false, false, false]);
    assert.deepEqual(values, [1, 2.3, 'hi']);
  });
  it('object and function', function() {
    let values = destructure.from('fn1', ['x:f', 'y:o'], [function(){}, {a:1}]);
    assert.deepEqual(values[0].constructor.name, 'Function');
    assert.deepEqual(values[1], {a:1});
    assert.throws(function() {
      let vals = destructure.from('fn1', ['x:f', 'y:o'], [function(){}, 123.4]);
    }, /could not convert to object: 123.4/);
  });

});
