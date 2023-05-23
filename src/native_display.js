const baseDisplay = require('./base_display.js');

class NativeDisplay extends baseDisplay.BaseDisplay {
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
    return true;
  }

  setSceneSize(width, height) {
    this.width = width;
    this.height = height;
  }

  setRenderer(renderer) {
    this._renderer = renderer;
  }

  setZoom(zoomLevel) {
    this._b.config('zoom', zoomLevel);
  }

  setGrid(unit) {
    this._b.config('grid', unit);
  }

  setInstrumentation(inst) {
    this._b.config('instrumentation', inst);
  }

  setVeryVerboseTiming(timing) {
    this._b.config('vv', timing);
  }

  stopRunning() {
    super.stopRunning();
    return this._b.exitLoop();
  }

  appLoop(loopID, execNextFrame) {
    this._b.beginRender(this.width, this.height, this._renderer);
    return this._b.runAppLoop(loopID, execNextFrame);
  }

  registerEventHandler(eventName, region, callback) {
    return this._b.handleEvent(eventName, region, callback);
  }

  insteadWriteBuffer(buffer) {
    return this._b.insteadWriteBuffer(buffer);
  }
}

module.exports.NativeDisplay = NativeDisplay;
