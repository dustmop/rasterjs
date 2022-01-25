var util = require('./util.js');
var ra = require('../src/lib.js');

describe('Interrupts', function() {
  it('change scroll', function() {
    ra.resetState();
    ra.useColors('pico8');

    let img = ra.loadImage('test/testdata/small-fruit.png');
    ra.drawImage(img);

    ra.useInterrupts([
      {scanline:  0, irq: () => { ra.setScrollX(0) }},
      {scanline:  2, irq: () => { ra.setScrollX(1) }},
      {scanline:  5, irq: () => { ra.setScrollX(3) }},
      {scanline:  6, irq: () => { ra.setScrollX(5) }},
      {scanline: 45, irq: () => { ra.setScrollX(0) }},
    ]);

    util.renderCompareTo(ra, 'test/testdata/irq-fruit.png');
  });

});
