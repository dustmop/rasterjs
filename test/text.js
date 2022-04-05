var ra = require('../src/lib.js');
var util = require('./util.js');

describe('Text', function() {
  it('write text from yaff', function() {
    ra.resetState();
    ra.setSize({w: 24, h: 12});
    ra.setFont('test/testdata/romulus.yaff');
    ra.drawText('abc', 1, 2);
    util.renderCompareTo(ra, 'test/testdata/abc.png');
  });

  it('write text from tiny', function() {
    ra.resetState();
    ra.setSize({w: 26, h: 9});
    ra.setFont('font:tiny');
    ra.drawText('winner', 1, 2);
    util.renderCompareTo(ra, 'test/testdata/winner.png');
  });

  it('write text from basic', function() {
    ra.resetState();
    ra.setSize({w: 84, h: 12});
    ra.setFont('test/testdata/pixel-font-basic.png',
               { char_width: 7, char_height: 9, charmap: [0x20, 0x80] });
    ra.drawText('Hello World!', 1, 2);
    util.renderCompareTo(ra, 'test/testdata/hello.png');
  });

});
