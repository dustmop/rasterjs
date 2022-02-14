var assert = require('assert');
var ra = require('../src/lib.js');

describe('Display', function() {
  it('custom', function() {
    ra.resetState();

    let display = new myDisplay();
    ra.useDisplay(display);
    ra.setSize({w:6, h:7});
    ra.setZoom(4);
    ra.drawCircle({x:1, y:1, r:3});
    ra.show();

    let expect = (
      1000 + // initialize
      4 +    // zoom
      60 +   // width
      700    // height
    );
    assert.equal(display.count, expect);
  });
});

function myDisplay() {
  this.count = 0;
  this.plane = null;
  return this;
}

myDisplay.prototype.initialize = function() {
  this.count = 1000;
}

myDisplay.prototype.setSize = function(width, height) {
  // pass
}

myDisplay.prototype.setRenderer = function(renderer) {
  this.renderer = renderer;
}

myDisplay.prototype.setZoom = function(zoomLevel) {
  this.count += zoomLevel;
}

myDisplay.prototype.setGrid = function(unit) {
}

myDisplay.prototype.renderLoop = function(nextFrame) {
  let layer = this.renderer._layers[0].plane;
  this.count += layer.width * 10;
  this.count += layer.height * 100;
}
