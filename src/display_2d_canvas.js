function Display() {
  this.canvas = null;
  this.numToLoad = 0;
  this.numLoadDone = 0;
  return this;
}

const DONT_SHARPEN = 1;

Display.prototype.initialize = function() {
}

Display.prototype.setSource = function(plane, zoomLevel) {
  this.plane = plane;

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

  var elemWidth = plane.width;
  var elemHeight = plane.height;

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

Display.prototype.waitForImageLoads = function(cb) {
  let self = this;
  setTimeout(function() {
    if (self.numToLoad > self.numLoadDone) {
      self.waitForImageLoads(cb);
      return;
    }
    cb();
  }, 0);
}

Display.prototype.renderLoop = function(nextFrame, num, exitAfter, finalFunc) {
  let pl = this.plane;
  let frontBuffer = null;
  let ctx = this.canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.mozImageSmoothingEnabled = false;

  let renderIt = function() {
    // Get the data buffer from the plane.
    if (!frontBuffer) {
      frontBuffer = pl.trueBuffer();
    }

    if (frontBuffer) {
      let buff = Uint8ClampedArray.from(frontBuffer);
      let image = new ImageData(buff, pl.width, pl.height);
      ctx.putImageData(image, 0, 0);
    }

    // Create the next frame.
    nextFrame();

    if (finalFunc) {
      finalFunc();
    }

    // Wait for next frame.
    requestAnimationFrame(renderIt);
  };
  this.waitForImageLoads(function() {
    requestAnimationFrame(renderIt);
  });
}

module.exports.Display = Display;

