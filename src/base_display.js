class BaseDisplay {
  initialize() {}

  kind() {
    return 'display';
  }

  name() {
    throw new Error(`NotImplemented: BaseDisplay.name`);
  }

  isRealTime() {
    return false;
  }

  beginExec(refExec) {}

  setSceneSize(width, height) {
    this._width = width;
    this._height = height;
  }

  setRenderer(renderer) {
    this._renderer = renderer;
  }

  setZoom(zoomLevel) {
    this._zoomLevel = zoomLevel;
  }

  setGrid(unit) {
    this._gridUnit = unit;
  }

  beginLoop() {
    this._isRunning = true;
  }

  appLoop(loopID, eachFrame) {
    throw new Error(`NotImplemented: BaseDisplay.appLoop`);
  }

  isRunning() {
    return this._isRunning;
  }

  stopRunning() {
    this._isRunning = false;
  }

  forwardNativeEvents(eventManager) {
    // many displays will not handle native events
  }
}

module.exports.BaseDisplay = BaseDisplay;
