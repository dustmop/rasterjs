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

myDisplay.prototype.setSource = function(renderer, zoomLevel) {
  this.renderer = renderer;
  this.count += zoomLevel;
  // NOTE: At this point, plane.width and plane.height have
  // *not* necessarily been assigned by setSize.
}

myDisplay.prototype.renderLoop = function(nextFrame) {
  this.count += this.renderer.plane.width * 10;
  this.count += this.renderer.plane.height * 100;
}
