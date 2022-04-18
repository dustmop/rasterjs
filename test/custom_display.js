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

    let gotKey = false;
    ra.on('keypress', function(e) {
      gotKey = true;
    });
    display._pushFakeEvent({key: 'ok'});
    assert.equal(gotKey, true);
  });

  it('allowed events', function() {
    ra.resetState();

    let display = new myDisplay();
    ra.on('keypress', function(e) {});
    ra.on('click', function(e) {});

    assert.throws(() => {
      ra.on('ready', function(e) {});
    });
  });
});

function myDisplay() {
  this.count = 0;
  this.plane = null;
  this.eventHandler = null;
  return this;
}

myDisplay.prototype.initialize = function() {
  this.count = 1000;
}

myDisplay.prototype.handleEvent = function(eventName, callback) {
  this.eventHandler = callback;
}

myDisplay.prototype._pushFakeEvent = function(e) {
  if (this.eventHandler) {
    this.eventHandler(e);
  }
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

myDisplay.prototype.setGrid = function(state) {
}

myDisplay.prototype.renderLoop = function(nextFrame) {
  let layer = this.renderer._layers[0].plane;
  this.count += layer.width * 10;
  this.count += layer.height * 100;
}
