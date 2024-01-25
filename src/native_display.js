const baseDisplay = require('./base_display.js');

class NativeDisplay extends baseDisplay.BaseDisplay {
  constructor(backend) {
    super();
    this._b = backend;
    this._handlers = null;
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
    let features = this.getBackendFeatures();
    if (features.forceSoftwareCompositor) {
      this._renderer.requirements.forceSoftwareCompositor = true;
    }
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

  forwardNativeEvents(eventManager) {
    this._eventManager = eventManager;
    this._b.eventReceiver((name, nativeEvent) => {
      if (name == 'keypress' || name == 'keydown' || name == 'keyup') {
        this._eventManager.getNativeKey(name, nativeEvent);
      } else if (name == 'click') {
        this._eventManager.getNativeClick(name, nativeEvent);
      } else {
        throw new Error(`unknown event name "${name}"`);
      }
    });
  }

  insteadWriteBuffer(buffer) {
    return this._b.insteadWriteBuffer(buffer);
  }

  getBackendFeatures() {
    let features = {};
    let featureList = this._b.getFeatureList() || [];
    for (let f of featureList) {
      features[f] = true;
    }
    return features;
  }

  _testOnlySendClick(e) {
    // TODO: assert e is {x:x,y:y}
    return this._b.testOnlyHook(e);
  }
}

module.exports.NativeDisplay = NativeDisplay;
