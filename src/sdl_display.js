const baseDisplay = require('./base_display.js');

// TODO: Move some logic here, such that the backend is the minimal required
// to interact with SDL. Perhaps combine the `set*` methods into `configure`.

class SDLDisplay extends baseDisplay.BaseDisplay {
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

  setSize(width, height) {
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

  handleEvent(eventName, callback) {
    return this._b.handleEvent(eventName, callback);
  }

  insteadWriteBuffer(buffer) {
    return this._b.insteadWriteBuffer(buffer);
  }
}

module.exports.SDLDisplay = SDLDisplay;
