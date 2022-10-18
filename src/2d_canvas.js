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

  setRenderer(renderer) {
    this._renderer = renderer;
    this._hasDocumentBody = false;
    let self = this;
    window.addEventListener('DOMContentLoaded', function() {
      self._hasDocumentBody = true;
    });
    if (document.readyState == 'complete' || document.readyState == 'loaded') {
      self._hasDocumentBody = true;
    }
  }

  setZoom(_zoomLevel) {
    // NOTE: zoomLevel is ignored
  }

  setGrid(state) {
    this.gridState = state;
  }

  _createEventHandlers() {
    let self = this;
    document.addEventListener('keypress', function(e) {
      if (self.sysEventHandler) {
        self.sysEventHandler({
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
    let self = this;
    setTimeout(function() {
      if (!self._hasDocumentBody) {
        self.waitForContentLoad(cb);
        return;
      }
      cb();
    }, 0);
  }

  appLoop(id, nextFrame) {
    let self = this;
    this.waitForContentLoad(function() {
      self._create2dCanvas();
      self._beginLoop(id, nextFrame);
    });
  }

  _beginLoop(id, nextFrame) {
    let frontBuffer = null;
    let ctx = this.canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.mozImageSmoothingEnabled = false;
    let self = this;
    this._isRunning = true;

    let renderIt = function() {
      if (!self._isRunning) {
        return;
      }

      // Get the data buffer from the plane.
      let res = self._renderer.render();
      if (!frontBuffer) {
        frontBuffer = res[0].buff;
      }

      if (frontBuffer) {
        let buff = Uint8ClampedArray.from(frontBuffer);
        let image = new ImageData(buff, self._width, self._height);
        ctx.putImageData(image, 0, 0);
      }

      // Create the next frame.
      nextFrame();

      // Wait for next frame.
      requestAnimationFrame(renderIt);
    };

    renderIt();
  }

  handleEvent(eventName, callback) {
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

