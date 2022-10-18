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

  appLoop(loopID, eachFrame) {
    throw new Error(`NotImplemented: BaseDisplay.appLoop`);
  }

  stopRunning() {
    this._isRunning = false;
  }

  handleEvent(eventName, callback) {
    throw new Error(`NotImplemented: BaseDisplay.handleEvent`);
  }
}

module.exports.BaseDisplay = BaseDisplay;
