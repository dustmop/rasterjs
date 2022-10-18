var assert = require('assert');
var ra = require('../src/lib.js');

describe('Ascii', function() {
  it('display', function() {
    ra.resetState();
    ra.useDisplay('ascii');

    // Capture stdout
    let stdout = '';
    let originalWrite = process.stdout.write;
    process.stdout.write = function(text) {
      stdout += text;
    }

    ra.fillColor(1);
    ra.setSize({w: 8, h: 8});

    ra.setColor(2);
    ra.drawLine(1, 4, 7, 4);

    ra.setColor(3);
    ra.drawCircle({x: 3, y: 0, r: 3});

    ra.setColor(0);
    ra.drawDot(3, 7);

    ra.run();

    process.stdout.write = originalWrite;

    let expect = `
.....--.
....-..-
...-....
...-....
.___-__-
.....--.
........
... ....
`
    stdout = stdout.trim();
    expect = expect.trim();
    assert.equal(expect, stdout);
  });
});
