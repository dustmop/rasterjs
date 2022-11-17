class BaseDisplay {
  initialize() {}

  beginExec(refExec) {}

  setSize(width, height) {
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

  handleEvent(eventName, region, callback) {
    throw new Error(`NotImplemented: BaseDisplay.handleEvent`);
  }
}

module.exports.BaseDisplay = BaseDisplay;
