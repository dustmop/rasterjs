const algorithm = require('./algorithm.js');
const geometry = require('./geometry.js');
const frameMemory = require('./frame_memory.js');

const D_CLEAN      = 0;
const D_FILL_SOLID = 1;
const D_FILL_DOTS  = 2;
const D_DIRTY      = 3;
const D_DID_FILL   = 4;
const D_DRAWN      = 5;
const MAX_DOTS_DRAWN = 36;

function Plane(rawBuffer, options) {
  this.rawBuffer = rawBuffer;
  this.saveService = null;
  if (options && options.saveService) {
    this.saveService = options.saveService;
  }
  this.clear();
  return this;
}

Plane.prototype.clear = function() {
  this.width = 100;
  this.height = 100;
  this.translateX = 0;
  this.translateY = 0;
  this.mem = null;
  this._backBuffer = null;
  this.dirtyState = D_CLEAN;
  this.dotsDrawn = new Array();
  this.bgColor = 0;
  this.frontColor = 7;
  this.rawBuffer.clear();
}

Plane.prototype.trueBuffer = function() {
  return this.rawBuffer.rawData();
}

Plane.prototype.setSize = function(width, height) {
  // TODO: destructure
  this.width = width;
  this.height = height;
  this.rawBuffer.setSize(width, height);
}

Plane.prototype.setColor = function(color) {
  this.frontColor = color;
  this.rawBuffer.setColor(color);
}

Plane.prototype.setTrueColor = function(rgb) {
  let color = this.rawBuffer.addRgbMapEntry(rgb);
  this.setColor(color);
}

Plane.prototype.assignRgbMap = function(rgbMap) {
  // TODO: Keep colorSet in a separate object. Let rawBuffer have
  // a reference to it.
  this.rawBuffer.assignRgbMap(rgbMap);
}

Plane.prototype.fillBackground = function(color) {
  this.dirtyState = D_FILL_SOLID;
  this.bgColor = color;
  this.rawBuffer.fillBackground(color);
}

Plane.prototype.fillTrueBackground = function(rgb) {
  this.dirtyState = D_FILL_SOLID;
  let color = this.rawBuffer.addRgbMapEntry(rgb);
  this.fillBackground(color);
}

Plane.prototype.setTranslation = function(relPos) {
  this.translateX = Math.floor(this.width * relPos);
  this.translateY = Math.floor(this.height * relPos);
}

Plane.prototype._getTranslation = function() {
  return [this.translateX, this.translateY];
}

Plane.prototype.drawLine = function(x0, y0, x1, y1, cc) {
  cc = cc ? 1 : 0;
  let [tx, ty] = this._getTranslation();
  this.dirtyState = D_DIRTY;
  let res = algorithm.renderLine(this, tx + x0, ty + y0, tx + x1, ty + y1, cc);
  this.rawBuffer.putSequence(res);
}

Plane.prototype.drawDot = function(x, y) {
  let [tx, ty] = this._getTranslation();
  if (this.dirtyState == D_CLEAN || D_FILL_SOLID) {
    this.dirtyState = D_FILL_DOTS;
  }
  if (this.dirtyState == D_FILL_DOTS) {
    this.dotsDrawn.push([tx + x, ty + y, this.frontColor]);
  }
  if (this.dotsDrawn.length > MAX_DOTS_DRAWN) {
    this.dirtyState = D_DIRTY;
    this.dotsDrawn.splice(0);
  }
  let put = [[tx + x, ty + y]];
  this.rawBuffer.putSequence(put);
}

Plane.prototype.fillDot = function(dots) {
  this.dirtyState = D_DIRTY;
  let height = dots.length;
  let width = dots[0].length;
  let mem = frameMemory.NewFrameMemory(this.width, this.height);
  for (let y = 0; y < mem.y_dim; y++) {
    for (let x = 0; x < mem.x_dim; x++) {
      let i = y % height;
      let j = x % width;
      mem[y*mem.pitch+x] = dots[i][j];
    }
  }
  this.rawBuffer.putFrameMemory(mem);
}

Plane.prototype.fillSquare = function(x, y, size) {
  let [tx, ty] = this._getTranslation();
  this.dirtyState = D_DIRTY;
  this._renderRect(tx + x, ty + y, size, size, true);
}

Plane.prototype.drawSquare = function(x, y, size) {
  let [tx, ty] = this._getTranslation();
  this.dirtyState = D_DIRTY;
  this._renderRect(tx + x, ty + y, size, size, false);
}

Plane.prototype.fillRect = function(x, y, w, h) {
  let [tx, ty] = this._getTranslation();
  this.dirtyState = D_DIRTY;
  this._renderRect(tx + x, ty + y, w, h, true);
}

Plane.prototype.drawRect = function(x, y, w, h) {
  let [tx, ty] = this._getTranslation();
  this.dirtyState = D_DIRTY;
  this._renderRect(tx + x, ty + y, w, h, false);
}

Plane.prototype._renderRect = function(x, y, w, h, fill) {
  x = Math.floor(x);
  y = Math.floor(y);
  let x1 = Math.floor(x + w - 1);
  let y1 = Math.floor(y + h - 1);

  let tmp;
  if (x > x1) {
    tmp = x;
    x = x1;
    x1 = tmp;
  }
  if (y > y1) {
    tmp = y;
    y = y1;
    y1 = tmp;
  }

  let put = [];
  if (fill) {
    for (let n = y; n <= y1; n++) {
      put.push([x, x + w - 1, n, n]);
    }
    this.rawBuffer.putSequence(put);
    return;
  }

  put.push([ x, x1,  y,  y]); // top
  put.push([ x, x1, y1, y1]); // bottom
  put.push([ x,  x,  y, y1]); // left
  put.push([x1, x1,  y, y1]); // right
  this.rawBuffer.putSequence(put);
}

Plane.prototype.fillCircle = function(x, y, r) {
  let [tx, ty] = this._getTranslation();
  this.dirtyState = D_DIRTY;
  let centerX = tx + x + r;
  let centerY = ty + y + r;
  let arc = algorithm.midpointCircleRasterize(r);
  let half = algorithm.isHalfwayValue(r);
  let put = algorithm.renderCircle(centerX, centerY, arc, null, true, half);
  this.rawBuffer.putSequence(put);
}

Plane.prototype.drawCircle = function(x, y, r, width) {
  let [tx, ty] = this._getTranslation();
  this.dirtyState = D_DIRTY;
  let centerX = tx + x + r;
  let centerY = ty + y + r;
  let arc = algorithm.midpointCircleRasterize(r);
  let inner = null;
  if (width) {
    inner = algorithm.midpointCircleRasterize(r - width + 1);
  }
  let half = algorithm.isHalfwayValue(r);
  let put = algorithm.renderCircle(centerX, centerY, arc, inner, false, half);
  this.rawBuffer.putSequence(put);
}

Plane.prototype.fillPolygon = function(polygon, x, y) {
  x = x || 0;
  y = y || 0;
  let [tx, ty] = this._getTranslation();
  let points = geometry.convertToPoints(polygon);
  this.dirtyState = D_DIRTY;
  let res = algorithm.renderPolygon(this, tx + x, ty + y, points, true);
  this.rawBuffer.putSequence(res);
}

Plane.prototype.drawPolygon = function(polygon, x, y) {
  x = x || 0;
  y = y || 0;
  let [tx, ty] = this._getTranslation();
  let points = geometry.convertToPoints(polygon);
  this.dirtyState = D_DIRTY;
  let res = algorithm.renderPolygon(this, tx + x, ty + y, points, false);
  this.rawBuffer.putSequence(res);
}

Plane.prototype.fillFlood = function(x, y) {
  this.dirtyState = D_DIRTY;
  let image = {
    palette: [],
    buffer: [],
    pitch: null,
  };
  this.rawBuffer.retrieveTrueContent(image);
  let mem = frameMemory.NewFrameMemory(this.width, this.height);
  for (let k = 0; k < image.buffer.length; k++) {
    mem[k] = image.buffer[k];
  }
  algorithm.flood(mem, x, y, this.frontColor);
  this.rawBuffer.putFrameMemory(mem);
}

Plane.prototype.fillFrame = function(options, fillerFunc) {
  if (this.mem == null) {
    this.mem = frameMemory.NewFrameMemory(this.width, this.height);
    if (this.dirtyState == D_CLEAN) {
      this.dirtyState = D_FILL_SOLID;
    }
  }

  if (options && options.previous && !this.mem._didFrame) {
    this.mem.createBackBuffer();
    // If buffer is created from an unknown previous frame, load the contents
    if (this.dirtyState == D_DRAWN) {
      let image = {
        palette: [],
        buffer: [],
        pitch: null,
      };
      this.rawBuffer.retrieveTrueContent(image);
      for (let k = 0; k < image.buffer.length; k++) {
        this.mem._backBuffer[k] = image.buffer[k];
      }
    }
  }

  // If background color was set, fill the memory
  if (this.dirtyState == D_FILL_SOLID) {
    this.mem.fill(this.bgColor);
  }

  // Update the frame memory based upon changes made to the plane.
  if (this.dirtyState == D_FILL_DOTS) {
    for (let i = 0; i < this.dotsDrawn.length; i++) {
      let row = this.dotsDrawn[i];
      let x = row[0];
      let y = row[1];
      this.mem[x + y*this.mem.pitch] = row[2];
    }
    this.dotsDrawn.splice(0);
  } else if (this.dirtyState == D_DIRTY || this.dirtyState == D_DRAWN) {
    let image = {
      palette: [],
      buffer: [],
      pitch: null,
    };
    this.rawBuffer.retrieveTrueContent(image);
    for (let k = 0; k < image.buffer.length; k++) {
      this.mem[k] = image.buffer[k];
    }
  }
  // Invoke the callback
  if (fillerFunc.length == 1) {
    fillerFunc(this.mem);
  } else if (fillerFunc.length == 3) {
    for (let y = 0; y < this.mem.y_dim; y++) {
      for (let x = 0; x < this.mem.x_dim; x++) {
        let ret = fillerFunc(this.mem, x, y);
        if (ret !== null && ret !== undefined) {
          this.mem[x + y*this.mem.pitch] = ret;
        }
      }
    }
  } else {
    throw 'Invalid arguments for fillFrame: length = ' + fillerFunc.length;
  }
  // Render the frame memory into the plane
  this.dirtyState = D_DID_FILL;
  this.rawBuffer.putFrameMemory(this.mem);
  this.mem._didFrame = true;
}

Plane.prototype.drawImage = function(img, x, y) {
  if (!img.data) {
    throw 'drawImage: image has been opened, but not yet read';
  }
  let [tx, ty] = this._getTranslation();
  // TODO: Not just dirty, after drawImage we're not sure if the image
  // is 8-bit safe, or if it now needs trueColor
  this.dirtyState = D_DIRTY;
  this.rawBuffer.putImage(img, tx + x, ty + y);
}

Plane.prototype.drawText = function(text, x, y) {
  if (!this.font) {
    throw 'drawText: no font has been assigned';
  }
  if (!this.font.glyphs) {
    throw 'drawText: font has been opened, but not yet read';
  }

  let put = [];
  let cursor = 0;

  for (let i = 0; i < text.length; i++) {
    let ch = text[i];
    let num = ch.charCodeAt(0);
    let name = num.toString(16);
    let glyph = this.font.glyphs[name];

    if (!glyph) {
      console.log(`glyph for '${name}' not found`);
      continue;
    }

    let len = 0;
    for (let a = 0; a < glyph.length; a++) {
      let row = glyph[a];
      if (row.length > len) {
        len = row.length;
      }
      for (let b = 0; b < row.length; b++) {
        if (row[b] == '#') {
          put.push([x + cursor + b, y + a]);
        }
      }
    }
    cursor += len;
  }
  this.dirtyState = D_DIRTY;
  this.rawBuffer.putSequence(put);
}

Plane.prototype.nextFrame = function() {
  let old = this.dirtyState;
  if (this.dirtyState == D_DID_FILL || this.dirtyState == D_CLEAN) {
    this.dirtyState = D_CLEAN;
  } else {
    this.dirtyState = D_DRAWN;
  }
  if (this.mem) {
    this.mem._didFrame = false;
  }
}

Plane.prototype.save = function(savepath) {
  let buffer = this.trueBuffer();
  // TODO: fix definition of pitch
  let pitch = this.width * 4;
  if (!this.saveService) {
    throw new Error('cannot save plane without save service');
  }
  this.saveService.saveTo(savepath, buffer, this.width, this.height, pitch);
}

module.exports.Plane = Plane;
