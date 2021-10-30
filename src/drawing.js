const algorithm = require('./algorithm.js');
const geometry = require('./geometry.js');
const frameMemory = require('./frame_memory.js');

function Drawing() {
  return this;
}

Drawing.prototype.getMethods = function() {
  let result = [];
  for (let fname in this) {
    if (fname.endsWith('_params')) { continue; }
    let pname = fname + '_params';
    if (this[pname]) {
      let impl = this[fname];
      result.push([fname, this[pname], impl]);
    }
  }
  return result;
}

Drawing.prototype.setSize_params = ['w:i', 'h?i'];
Drawing.prototype.setSize = function(width, height) {
  if (height === undefined) { height = width; }
  this._setSize(width, height);
}

Drawing.prototype.setColor_params = ['color:i'];
Drawing.prototype.setColor = function(color) {
  this.frontColor = color;
}

Drawing.prototype.setTrueColor_params = ['rgb:i'];
Drawing.prototype.setTrueColor = function(rgb) {
  if (typeof rgb !== 'number') {
    throw new Error('setTrueColor needs rgb as a number');
  }
  let color = this.scene.colorSet.addEntry(rgb);
  this.setColor(color);
}

Drawing.prototype.fillBackground_params = ['color:i'];
Drawing.prototype.fillBackground = function(color) {
  this.bgColor = color;
  this._needErase = true;
}

Drawing.prototype.fillTrueBackground_params = ['rgb:i'];
Drawing.prototype.fillTrueBackground = function(rgb) {
  let color = this.scene.colorSet.addEntry(rgb);
  this.fillBackground(color);
}

Drawing.prototype.drawLine_params = ['x0:i', 'y0:i', 'x1:i', 'y1:i', 'cc?b'];
Drawing.prototype.drawLine = function(x0, y0, x1, y1, cc) {
  cc = cc ? 1 : 0;
  let res = algorithm.renderLine(this, x0, y0, x1, y1, cc);
  this.putSequence(res);
}

Drawing.prototype.drawDot_params = ['x:i', 'y:i'];
Drawing.prototype.drawDot = function(x, y) {
  let put = [[x, y]];
  this.putSequence(put);
}

Drawing.prototype.fillDot_params = ['dots:any'];
Drawing.prototype.fillDot = function(dots) {
  this._prepare();
  let buffer = this.data;

  let height = dots.length;
  let width = dots[0].length;
  let mem = frameMemory.NewFrameMemory(this.offsetLeft, this.offsetTop, this.width, this.height);
  for (let y = 0; y < mem.y_dim; y++) {
    for (let x = 0; x < mem.x_dim; x++) {
      let i = y % height;
      let j = x % width;
      mem[y*mem.pitch+x] = dots[i][j];
    }
  }
  mem.copyTo(buffer, this);
}

Drawing.prototype.fillSquare_params = ['x:i', 'y:i', 'size:i'];
Drawing.prototype.fillSquare = function(x, y, size) {
  _renderRect(this, x, y, size, size, true);
}

Drawing.prototype.drawSquare_params = ['x:i', 'y:i', 'size:i'];
Drawing.prototype.drawSquare = function(x, y, size) {
  _renderRect(this, x, y, size, size, false);
}

Drawing.prototype.fillRect_params = ['x:i', 'y:i', 'w:i', 'h:i'];
Drawing.prototype.fillRect = function(x, y, w, h) {
  _renderRect(this, x, y, w, h, true);
}

Drawing.prototype.drawRect_params = ['x:i', 'y:i', 'w:i', 'h:i'];
Drawing.prototype.drawRect = function(x, y, w, h) {
  _renderRect(this, x, y, w, h, false);
}

function _renderRect(self, x, y, w, h, fill) {
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
    self.putSequence(put);
    return;
  }

  put.push([ x, x1,  y,  y]); // top
  put.push([ x, x1, y1, y1]); // bottom
  put.push([ x,  x,  y, y1]); // left
  put.push([x1, x1,  y, y1]); // right
  self.putSequence(put);
}

Drawing.prototype.fillCircle_params = ['x:i', 'y:i', 'r:i'];
Drawing.prototype.fillCircle = function(x, y, r) {
  let centerX = x + r;
  let centerY = y + r;
  let arc = algorithm.midpointCircleRasterize(r);
  let half = algorithm.isHalfwayValue(r);
  let put = algorithm.renderCircle(centerX, centerY, arc, null, true, half);
  this.putSequence(put);
}

Drawing.prototype.drawCircle_params = ['x:i', 'y:i', 'r:i', 'width?i'];
Drawing.prototype.drawCircle = function(x, y, r, width) {
  let centerX = x + r;
  let centerY = y + r;
  let arc = algorithm.midpointCircleRasterize(r);
  let inner = null;
  if (width) {
    inner = algorithm.midpointCircleRasterize(r - width + 1);
  }
  let half = algorithm.isHalfwayValue(r);
  let put = algorithm.renderCircle(centerX, centerY, arc, inner, false, half);
  this.putSequence(put);
}

Drawing.prototype.fillPolygon_params = ['points:ps', 'x?i', 'y?i'];
Drawing.prototype.fillPolygon = function(polygon, x, y) {
  x = x || 0;
  y = y || 0;
  let points = geometry.convertToPoints(polygon);
  let res = algorithm.renderPolygon(this, x, y, points, true);
  this.putSequence(res);
}

Drawing.prototype.drawPolygon_params = ['points:ps', 'x?i', 'y?i'];
Drawing.prototype.drawPolygon = function(polygon, x, y) {
  x = x || 0;
  y = y || 0;
  let points = geometry.convertToPoints(polygon);
  let res = algorithm.renderPolygon(this, x, y, points, false);
  this.putSequence(res);
}

Drawing.prototype.fillFlood_params = ['x:i', 'y:i'];
Drawing.prototype.fillFlood = function(x, y) {
  this._prepare();
  let buffer = this.data;

  let mem = frameMemory.NewFrameMemory(this.offsetLeft, this.offsetTop, this.width, this.height);
  mem.from(buffer, this);
  algorithm.flood(mem, x, y, this.frontColor);
  mem.copyTo(buffer, this);
}

Drawing.prototype.fillFrame_params = ['options?o', 'fillerFunc:f'];
Drawing.prototype.fillFrame = function(options, fillerFunc) {
  if (this.mem == null) {
    this.mem = frameMemory.NewFrameMemory(this.offsetLeft, this.offsetTop, this.width, this.height);
  }
  if (options && options.previous && !this.mem._didFrame) {
    this.mem.createBackBuffer();
    // If buffer is created from an unknown previous frame, load the contents
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        let k = y*this.width + x;
        let j = y*this.pitch + x;
        this.mem._backBuffer[k] = this.data[j];
      }
    }
  }

  this._prepare();
  let buffer = this.data;
  this.mem.from(buffer, this);

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

  this.mem.copyTo(buffer, this);
  this.mem._didFrame = true;
}

Drawing.prototype.drawImage_params = ['img:a', 'x?i', 'y?i'];
Drawing.prototype.drawImage = function(img, x, y) {
  if (!img.data) {
    throw 'drawImage: image has been opened, but not yet read';
  }
  x = x || 0;
  y = y || 0;
  if (this.width == 100 && this.height == 100) {
    // TODO: Hack, should use a real sentinel value.
    // TODO: Set the colorset as well.
    // TOOD: Don't do this if any draw/fill methods were called.
    this.setSize(img.width, img.height);
  }
  this.putImage(img, x, y);
}

Drawing.prototype.drawText_params = ['text:s', 'x:i', 'y:i'];
Drawing.prototype.drawText = function(text, x, y) {
  let font = this.scene.font;
  if (!font) {
    throw 'drawText: no font has been assigned';
  }
  if (!font.glyphs) {
    throw 'drawText: font has been opened, but not yet read';
  }

  let put = [];
  let cursor = 0;

  for (let i = 0; i < text.length; i++) {
    let ch = text[i];
    let num = ch.charCodeAt(0);
    let name = num.toString(16);
    let glyph = font.glyphs[name];

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
  this.putSequence(put);
}

module.exports.Drawing = Drawing;
