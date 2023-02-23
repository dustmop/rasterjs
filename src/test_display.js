const baseDisplay = require('./base_display.js');

class TestDisplay extends baseDisplay.BaseDisplay {
  // TODO: move the `backend` here, right now it's using SDL
  constructor(backend) {
    super();
    this._b = backend;
  }

  initialize() {
    this._b.initialize();
  }

  name() {
    return this._b.name();
  }

  isRealTime() {
    return false;
  }

  setSceneSize(width, height) {
    this._b.setSize(width, height);
  }

  setRenderer(renderer) {
    this._b.setRenderer(renderer);
  }

  setZoom(zoomLevel) {
    this._b.setZoom(zoomLevel);
  }

  setGrid(unit) {
    this._b.setGrid(unit);
  }

  setInstrumentation(inst) {
    this._b.setInstrumentation(inst);
  }

  setVeryVerboseTiming(timing) {
    this._b.setVeryVerboseTiming(timing);
  }

  stopRunning() {
    super.stopRunning();
    return this._b.exitLoop();
  }

  appLoop(loopID, execNextFrame) {
    return this._b.runDisplayLoop(loopID, execNextFrame);
  }

  handleEvent(eventName, region, callback) {
    return this._b.handleEvent(eventName, region, callback);
  }

  insteadWriteBuffer(buffer) {
    return this._b.insteadWriteBuffer(buffer);
  }
}

module.exports.TestDisplay = TestDisplay;