var ra = require('../src/lib.js');
var assert = require('assert');

describe('Dip', function() {
  it('set and check', function() {
    ra.resetState();
    ra.useDips(['infinite-lives', 'every-extend']);
    assert.equal(ra.dip['every-extend'], true);
    assert.deepEqual(ra.dipNames(), ['infinite-lives', 'every-extend']);
  });
});
