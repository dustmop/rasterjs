function Display() {
  this.canvas = null;
  this.numToLoad = 0;
  this.numLoadDone = 0;
  this.displayWidth = 0;
  this.displayHeight = 0;
  return this;
}

const DONT_SHARPEN = 1;

Display.prototype.initialize = function() {
}

Display.prototype.setSize = function(width, height) {
  this.displayWidth = width;
  this.displayHeight = height;
}

Display.prototype.setSource = function(renderer, zoomLevel) {
  this.renderer = renderer;

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

  // NOTE: zoomLevel is ignored
  var elemWidth = renderer.plane.width;
  var elemHeight = renderer.plane.height;

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
  let frontBuffer = null;
  let ctx = this.canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.mozImageSmoothingEnabled = false;
  let self = this;

  let renderIt = function() {
    // Get the data buffer from the plane.
    frontBuffer = self.renderer.render();

    if (frontBuffer) {
      let buff = Uint8ClampedArray.from(frontBuffer);
      let pl = self.renderer.plane;
      let image = new ImageData(buff, pl.width, pl.height);
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
  this.waitForImageLoads(function() {
    requestAnimationFrame(renderIt);
  });
}

module.exports.Display = Display;

