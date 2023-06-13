var assert = require('assert');
var ra = require('../src/lib.js');
const baseDisplay = require('../src/base_display.js');
const twoDeeDisplay = require('../src/2d_canvas.js');
const asciiDisplay = require('../src/ascii_display.js');
const httpDisplay = require('../src/http_display.js');
const saveImageDisplay = require('../src/save_image_display.js');
const nativeDisplay = require('../src/native_display.js');
const testDisplay = require('../src/test_display.js');
const tilesetBuilderDisplay = require('../src/tileset_builder.js');
const webglDisplay = require('../src/webgl_display.js');

describe('Display', function() {
  it('custom', function() {
    ra.resetState();

    let display = new MyDisplay();
    ra.useDisplay(display);
    ra.setSize({w:6, h:7});
    ra.setZoom(4);
    ra.drawCircle({x:1, y:1, r:3});
    ra.run(null);

    let expect1 = (
      1000 + // initialize
      4      // zoom
    );
    let expect2 = (
      1000 + // initialize
      500  + // appLoop
      4      // zoom
    );
    // TODO: Fix non-determinacy, caused by `run` using requestAnimationFrame
    // which may or may not call the appLoop fast enough.
    assert(display.count == expect1 || display.count == expect2);
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

  it('each display', function() {
    ra.resetState();

    let sdlBackend = {
      name() { return 'sdl'; }
    };
    let rpiBackend = {
      name() { return 'rpi'; }
    };

    let display = new twoDeeDisplay.TwoDeeDisplay();
    assert.equal(display.kind(), 'display');
    assert.equal(display.name(), '2d');

    display = new asciiDisplay.AsciiDisplay();
    assert.equal(display.kind(), 'display');
    assert.equal(display.name(), 'ascii');

    display = new httpDisplay.HTTPDisplay();
    assert.equal(display.kind(), 'display');
    assert.equal(display.name(), 'http');

    display = new saveImageDisplay.SaveImageDisplay('tmp.gif');
    assert.equal(display.kind(), 'display');
    assert.equal(display.name(), 'save-image');

    display = new nativeDisplay.NativeDisplay(sdlBackend);
    assert.equal(display.kind(), 'display');
    assert.equal(display.name(), 'sdl');

    display = new nativeDisplay.NativeDisplay(rpiBackend);
    assert.equal(display.kind(), 'display');
    assert.equal(display.name(), 'rpi');

    display = new testDisplay.TestDisplay();
    assert.equal(display.kind(), 'display');
    assert.equal(display.name(), 'test');

    display = new tilesetBuilderDisplay.TilesetBuilderDisplay();
    assert.equal(display.kind(), 'display');
    assert.equal(display.name(), 'tileset-builder');

    display = new webglDisplay.WebGLDisplay();
    assert.equal(display.kind(), 'display');
    assert.equal(display.name(), 'webgl');

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

  name() {
    return 'my-display';
  }

  forwardEventHandler(eventManager) {
    this._eventManager = eventManager;
  }

  setZoom(zoomLevel) {
    this.count += zoomLevel;
  }

  setGrid = function(state) {
    this.gridState = state;
  }

  appLoop = function(runID, nextFrame) {
    this.count += 500;
    // TODO: Remove need to call this twice, and firm up the display API.
    nextFrame();
    nextFrame();
  }
}
