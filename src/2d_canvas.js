function Display() {
  this.canvas = null;
  this.displayWidth = 0;
  this.displayHeight = 0;
  this.sysEventHandler = null;
  this._createEventHandlers();
  return this;
}

const DONT_SHARPEN = 1;

Display.prototype.initialize = function() {
}

Display.prototype.setSize = function(width, height) {
  this.displayWidth = width;
  this.displayHeight = height;
}

Display.prototype.setRenderer = function(renderer) {
  this.renderer = renderer;
  this._hasDocumentBody = false;
  let self = this;
  window.addEventListener('DOMContentLoaded', function() {
    self._hasDocumentBody = true;
  });
  if (document.readyState == 'complete' || document.readyState == 'loaded') {
    self._hasDocumentBody = true;
  }
}

Display.prototype.setZoom = function(_zoomLevel) {
  // NOTE: zoomLevel is ignored
}

Display.prototype.setGrid = function(unit) {
  this.gridUnit = unit;
}

Display.prototype._createEventHandlers = function() {
  let self = this;
  document.addEventListener('keypress', function(e) {
    if (self.sysEventHandler) {
      self.sysEventHandler({
        key: e.key
      });
    }
  })
}

Display.prototype._create2dCanvas = function() {
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

  var elemWidth = this.displayWidth;
  var elemHeight = this.displayHeight;

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

Display.prototype.waitForContentLoad = function(cb) {
  let self = this;
  setTimeout(function() {
    if (!self._hasDocumentBody) {
      self.waitForContentLoad(cb);
      return;
    }
    cb();
  }, 0);
}

Display.prototype.renderLoop = function(nextFrame, id, num, exitAfter, finalFunc) {
  let self = this;
  this.waitForContentLoad(function() {
    self._create2dCanvas();
    self._beginLoop(nextFrame, id, num, exitAfter, finalFunc);
  });
}

Display.prototype._beginLoop = function(nextFrame, id, num, exitAfter, finalFunc) {
  let frontBuffer = null;
  let ctx = this.canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.mozImageSmoothingEnabled = false;
  let self = this;

  let renderIt = function() {
    // Get the data buffer from the plane.
    let res = self.renderer.render();
    if (!frontBuffer) {
      frontBuffer = res[0].buff;
    }

    if (frontBuffer) {
      let buff = Uint8ClampedArray.from(frontBuffer);
      let image = new ImageData(buff, self.displayWidth, self.displayHeight);
      ctx.putImageData(image, 0, 0);
      if (num > 0) {
        num--;
      }
    }

    // Create the next frame.
    nextFrame();

    if (num == 0) {
      if (finalFunc) {
        finalFunc();
      }
      return;
    }

    // Wait for next frame.
    requestAnimationFrame(renderIt);
  };

  renderIt();
}

Display.prototype.handleEvent = function(eventName, callback) {
  if (eventName == 'keypress') {
    this.sysEventHandler = callback;
  } else if (eventName == 'click') {
    // pass
  } else {
    throw new Error(`only event "keypress" can be handled, got "${eventName}"`);
  }
}

module.exports.Display = Display;

