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


  it('scroll range', function() {
    ra.resetState();
    ra.useColors('pico8');

    let img = ra.loadImage('test/testdata/small-fruit.png');
    ra.drawImage(img);

    ra.useInterrupts([
      {scanline:     0, irq: () => { ra.setScrollX(0) }},
      {scanline:     2, irq: () => { ra.setScrollX(1) }},
      {scanline: [5,7], irq: (ln) => { ra.setScrollX(ln) }},
    ]);

    util.renderCompareTo(ra, 'test/testdata/diag-fruit.png');
  });


  it('fill color', function() {
    ra.resetState();
    ra.useColors('pico8');
    ra.setSize(8, 8);

    ra.useInterrupts([
      {scanline:  0, irq: () => { ra.fillColor(2) }},
      {scanline:  2, irq: () => { ra.fillColor(3) }},
      {scanline:  4, irq: () => { ra.fillColor(4) }},
      {scanline:  6, irq: () => { ra.fillColor(5) }},
    ]);

    util.renderCompareTo(ra, 'test/testdata/color_stripes.png');
  });


  it('serialize', function() {
    let tmpdir = util.mkTmpDir();
    let tmpout = tmpdir + '/actual.png';
    ra.resetState();
    ra.setSize(128, 128);

    let interrupts = ra.useInterrupts([
      {scanline:       0, irq: () => { ra.setScrollX(0) }},
      {scanline:      80, irq: () => { ra.setScrollX(80) }},
      {scanline: [90,99], irq: (ln) => { ra.setScrollX(ln) }},
    ]);

    ra.renderPrimaryPlane();

    let surfaces = interrupts.serialize();
    ra._saveSurfacesTo(surfaces, tmpout);
    util.ensureFilesMatch('test/testdata/interrupts_saved.png', tmpout);
  });

});
