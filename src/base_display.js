class BaseDisplay {
  initialize() {}

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

  setCallbacks(numFrames, exitAfter, finalFunc) {
    this._numFrames = numFrames;
    this._exitAfter = exitAfter;
    this._finalFunc = finalFunc;
  }

  appQuit() {
    this._quit = true;
  }

  renderLoop(loopID, eachFrame) {
    throw new Error(`NotImplemented: BaseDisplay.renderLoop`);
  }

  handleEvent(eventName, callback) {
    throw new Error(`NotImplemented: BaseDisplay.handleEvent`);
  }
}

module.exports.BaseDisplay = BaseDisplay;
