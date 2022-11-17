var assert = require('assert');
var ra = require('../src/lib.js');
const baseDisplay = require('../src/base_display.js');

describe('Display', function() {
  it('custom', function() {
    ra.resetState();

    let display = new MyDisplay();
    ra.useDisplay(display);
    ra.setSize({w:6, h:7});
    ra.setZoom(4);
    ra.drawCircle({x:1, y:1, r:3});
    ra.run();

    let expect = (
      1000 + // initialize
      4      // zoom
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

    let display = new MyDisplay();
    ra.on('keypress', function(e) {});
    ra.on('click', function(e) {});

    assert.throws(() => {
      ra.on('unknown', function(e) {});
    });
  });

  it('setGrid with unit', function() {
    ra.resetState();

    let display = new MyDisplay();
    ra.useDisplay(display);

    ra.setGrid(12);
    assert.equal(display.gridState, true);
    assert.equal(ra.config.gridUnit, 12);
  });

  it('setGrid default unit', function() {
    ra.resetState();

    let display = new MyDisplay();
    ra.useDisplay(display);

    ra.setGrid(true);
    assert.equal(display.gridState, true);
    assert.equal(ra.config.gridUnit, 16);
  });

  it('setGrid unit then disabled', function() {
    ra.resetState();

    let display = new MyDisplay();
    ra.useDisplay(display);

    ra.setGrid(12);
    ra.setGrid(false);
    assert.equal(display.gridState, false);
    assert.equal(ra.config.gridUnit, 12);
  });

  it('setGrid unit not enabled', function() {
    ra.resetState();

    let display = new MyDisplay();
    ra.useDisplay(display);

    ra.setGrid(12, {enable: false});
    assert.equal(display.gridState, false);
    assert.equal(ra.config.gridUnit, 12);
  });

  it('setGrid unit and empty options', function() {
    ra.resetState();

    let display = new MyDisplay();
    ra.useDisplay(display);

    ra.setGrid(12, {});
    assert.equal(display.gridState, true);
    assert.equal(ra.config.gridUnit, 12);
  });

});


class MyDisplay extends baseDisplay.BaseDisplay {
  // TODO: improve this once the Display API is done

  constructor() {
    super();
    this.count = 0;
    this._eventHandler = null;
    this._gridState = null;
  }

  initialize() {
    this.count = 1000;
  }

  handleEvent(eventName, region, callback) {
    this._eventHandler = callback;
  }

  _pushFakeEvent(e) {
    if (this._eventHandler) {
      this._eventHandler(e);
    }
  }

  setZoom(zoomLevel) {
    this.count += zoomLevel;
  }

  setGrid = function(state) {
    this.gridState = state;
  }

  appLoop = function(runID, nextFrame) {
    this.count += 500;
  }
}
