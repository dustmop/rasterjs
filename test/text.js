var ra = require('../src/lib.js');
var util = require('./util.js');

describe('Text', function() {
  it('write text', function() {
    ra.resetState();
    ra.setSize({w: 24, h: 12});
    ra.setFont('test/testdata/romulus.yaff');
    ra.drawText('abc', 1, 2);
    util.saveTmpCompareTo(ra, 'test/testdata/abc.png');
  });
});
