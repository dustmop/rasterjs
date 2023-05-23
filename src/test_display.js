const baseDisplay = require('./base_display.js');

class TestDisplay extends baseDisplay.BaseDisplay {
  // TODO: move the `backend` here, right now it's using SDL
  constructor() {
    super();
  }

  initialize() {
  }

  name() {
    return 'test';
  }

  isRealTime() {
    return false;
  }

  setSceneSize(width, height) {
  }

  setRenderer(renderer) {
  }

  setZoom(zoomLevel) {
  }

  setGrid(unit) {
  }

  setInstrumentation(inst) {
  }

  setVeryVerboseTiming(timing) {
  }

  stopRunning() {
  }

  appLoop(loopID, execNextFrame) {
  }

  registerEventHandler(eventName, region, callback) {
  }

  insteadWriteBuffer(buffer) {
  }
}

module.exports.TestDisplay = TestDisplay;
