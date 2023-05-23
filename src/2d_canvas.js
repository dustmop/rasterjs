const baseDisplay = require('./base_display.js');

const DONT_SHARPEN = 1;

class TwoDeeDisplay extends baseDisplay.BaseDisplay {
  constructor() {
    super();
    this.canvas = null;
    this._width = 0;
    this._height = 0;
    this.sysEventHandler = null;
    this._createEventHandlers();
    return this;
  }

  initialize() {
  }

  name() {
    return '2d';
  }

  setRenderer(renderer) {
    this._renderer = renderer;
    this._hasDocumentBody = false;
    window.addEventListener('DOMContentLoaded', () => {
      this._hasDocumentBody = true;
    });
    if (document.readyState == 'complete' || document.readyState == 'loaded') {
      this._hasDocumentBody = true;
    }
  }

  setZoom(_zoomLevel) {
    // NOTE: zoomLevel is ignored
  }

  setGrid(state) {
    this.gridState = state;
  }

  _createEventHandlers() {
    if (typeof document == 'undefined') { return; }
    document.addEventListener('keypress', (e) => {
      if (this.sysEventHandler) {
        this.sysEventHandler({
          key: e.key
        });
      }
    })
  }

  _create2dCanvas() {
    var canvasElems = document.getElementsByTagName('canvas');
    if (canvasElems.length >= 1) {
      this.canvas = canvasElems[0];
    } else {
      var canvasContainer = document.getElementById('canvas');
      if (canvasContainer) {
        this.canvas = document.createElement('canvas');
        canvasContainer.appendChild(this.canvas);
      } else {
        this.canvas = document.createElement('canvas');
        document.body.appendChild(this.canvas);
      }
    }

    var elemWidth = this._width;
    var elemHeight = this._height;

    // Canvas's coordinate system.
    this.canvas.width = elemWidth * DONT_SHARPEN;
    this.canvas.height = elemHeight * DONT_SHARPEN;

    // Size that element takes up in rendered page.
    var style = document.createElement('style');
    style.textContent = 'canvas { width: ' + elemWidth + 'px; height: ' +
      elemHeight + 'px; border: solid 1px black;' +
      'image-rendering: pixelated; image-rendering: crisp-edges;' +
      '}';
    document.body.appendChild(style);
  }

  waitForContentLoad(cb) {
    setTimeout(() => {
      if (!this._hasDocumentBody) {
        this.waitForContentLoad(cb);
        return;
      }
      cb();
    }, 0);
  }

  appLoop(id, nextFrame) {
    this.currentRunId = id;
    this.waitForContentLoad(() => {
      this._create2dCanvas();
      this._beginLoop(id, nextFrame);
    });
  }

  _beginLoop(id, nextFrame) {
    let frontBuffer = null;
    let ctx = this.canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.mozImageSmoothingEnabled = false;

    let renderIt = () => {
      if (!this.isRunning()) {
        return;
      }
      if (this.currentRunId != id) {
        return;
      }

      // Create the next frame.
      let hasFrame = nextFrame(id);
      if (!this.isRunning()) {
        return;
      }

      if (hasFrame) {
        // Get the data buffer from the field.
        let res = this._renderer.render();
        if (!frontBuffer) {
          frontBuffer = res[0].buff;
        }
      }

      if (frontBuffer) {
        let buff = Uint8ClampedArray.from(frontBuffer);
        let image = new ImageData(buff, this._width, this._height);
        ctx.putImageData(image, 0, 0);
      }

      // Wait for next frame.
      requestAnimationFrame(renderIt);
    };

    renderIt();
  }

  registerEventHandler(eventName, _region, callback) {
    if (eventName == 'keypress') {
      this.sysEventHandler = callback;
    } else if (eventName == 'click') {
      // pass
    } else {
      throw new Error(`only event "keypress" can be handled, got "${eventName}"`);
    }
  }
}

module.exports.TwoDeeDisplay = TwoDeeDisplay;

