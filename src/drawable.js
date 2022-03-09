const algorithm = require('./algorithm.js');
const geometry = require('./geometry.js');
const frameMemory = require('./frame_memory.js');

function Drawable() {
  return this;
}

Drawable.prototype.getMethods = function() {
  let result = [];
  for (let fname in this) {
    if (fname.endsWith('_params')) { continue; }
    let pname = fname + '_params';
    let cname = fname + '_convert';
    if (this[pname]) {
      result.push([fname, this[pname], this[cname], this[fname]]);
    }
  }
  return result;
}

Drawable.prototype.setColor_params = ['color:i'];
Drawable.prototype.setColor = function(color) {
  this.frontColor = color;
}

Drawable.prototype.fillColor_params = ['color:i'];
Drawable.prototype.fillColor = function(color) {
  this.bgColor = color;
  this._needErase = true;
}

Drawable.prototype.drawLine_params = ['x0:n', 'y0:n', 'x1:n', 'y1:n', 'cc?b'];
Drawable.prototype.drawLine = function(x0, y0, x1, y1, cc) {
  cc = cc ? 1 : 0;
  let res = algorithm.renderLine(this, x0, y0, x1, y1, cc);
  this.putSequence(res);
}

Drawable.prototype.drawDot_params = ['x:i', 'y:i'];
Drawable.prototype.drawDot = function(x, y) {
  let put = [[x, y]];
  this.putSequence(put);
}

Drawable.prototype.fillPattern_params = ['dots:any'];
Drawable.prototype.fillPattern = function(dots) {
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

Drawable.prototype.fillSquare_params = ['x:i', 'y:i', 'size:i'];
Drawable.prototype.fillSquare = function(x, y, size) {
  _renderRect(this, x, y, size, size, true);
}

Drawable.prototype.drawSquare_params = ['x:i', 'y:i', 'size:i'];
Drawable.prototype.drawSquare = function(x, y, size) {
  _renderRect(this, x, y, size, size, false);
}

Drawable.prototype.fillRect_params = ['x:i', 'y:i', 'w:i', 'h:i', '||',
                                      'x:i', 'y:i', 'x1:i', 'y1:i'];
Drawable.prototype.fillRect_convert = function(choice, vals) {
  return [vals[0], vals[1], vals[2] - vals[0], vals[3] - vals[1]];
}
Drawable.prototype.fillRect = function(x, y, w, h) {
  _renderRect(this, x, y, w, h, true);
}

Drawable.prototype.drawRect_params = ['x:i', 'y:i', 'w:i', 'h:i', '||',
                                      'x:i', 'y:i', 'x1:i', 'y1:i'];
Drawable.prototype.drawRect_convert = function(_choice, vals) {
  return [vals[0], vals[1], vals[2] - vals[0], vals[3] - vals[1]];
}
Drawable.prototype.drawRect = function(x, y, w, h) {
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

Drawable.prototype.fillCircle_params = ['x:i', 'y:i', 'r:n', '||',
                                        'centerX:i', 'centerY:i', 'r:n'];
Drawable.prototype.fillCircle_convert = function(_choice, vals) {
  return [vals[0]-vals[2]+0.5, vals[1]-vals[2]+0.5, vals[2]];
}
Drawable.prototype.fillCircle = function(x, y, r) {
  let centerX = x + r;
  let centerY = y + r;
  let arc = algorithm.midpointCircleRasterize(r);
  let half = algorithm.isHalfwayValue(r);
  let put = algorithm.renderCircle(centerX, centerY, arc, null, true, half);
  this.putSequence(put);
}

Drawable.prototype.drawCircle_params = ['x:i', 'y:i', 'r:n', 'thick?i', '||',
                                        'centerX:i', 'centerY:i', 'r:n',
                                            'thick?i'];
Drawable.prototype.drawCircle_convert = function(_choice, vals) {
  return [vals[0]-vals[2], vals[1]-vals[2], vals[2], vals[3]];
}
Drawable.prototype.drawCircle = function(x, y, r, thick) {
  let centerX = x + r;
  let centerY = y + r;
  let arc = algorithm.midpointCircleRasterize(r);
  let inner = null;
  if (thick) {
    inner = algorithm.midpointCircleRasterize(r - thick + 1);
  }
  let half = algorithm.isHalfwayValue(r);
  let put = algorithm.renderCircle(centerX, centerY, arc, inner, false, half);
  this.putSequence(put);
}

Drawable.prototype.fillPolygon_params = ['points:ps', 'x?i', 'y?i'];
Drawable.prototype.fillPolygon = function(polygon, x, y) {
  x = x || 0;
  y = y || 0;
  let points = geometry.convertToPoints(polygon);
  let res = algorithm.renderPolygon(this, x, y, points, true);
  this.putSequence(res);
}

Drawable.prototype.drawPolygon_params = ['points:ps', 'x?i', 'y?i'];
Drawable.prototype.drawPolygon = function(polygon, x, y) {
  x = x || 0;
  y = y || 0;
  let points = geometry.convertToPoints(polygon);
  let res = algorithm.renderPolygon(this, x, y, points, false);
  this.putSequence(res);
}

Drawable.prototype.fillFlood_params = ['x:i', 'y:i'];
Drawable.prototype.fillFlood = function(x, y) {
  this._prepare();
  let buffer = this.data;

  let mem = frameMemory.NewFrameMemory(this.offsetLeft, this.offsetTop, this.width, this.height);
  mem.from(buffer, this);
  algorithm.flood(mem, x, y, this.frontColor);
  mem.copyTo(buffer, this);
}

Drawable.prototype.fillFrame_params = ['options?o', 'fillerFunc:f'];
Drawable.prototype.fillFrame = function(options, fillerFunc) {
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

Drawable.prototype.drawImage_params = ['img:a', 'x?i', 'y?i'];
Drawable.prototype.drawImage = function(img, x, y) {
  if (!img.data) {
    throw 'drawImage: image has been opened, but not yet read';
  }
  x = x || 0;
  y = y || 0;
  if (this.width == 0 && this.height == 0) {
    // TODO: Set the colorset as well.
    this.setSize(img.width, img.height);
  }
  this.putImage(img, x, y);
}

Drawable.prototype.drawText_params = ['text:s', 'x:i', 'y:i'];
Drawable.prototype.drawText = function(text, x, y) {
  let font = this.font;
  if (!font) {
    throw new Error('drawText: no font has been assigned');
  }
  if (!font.glyphs) {
    throw new Error('drawText: font has been opened, but not yet read');
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

module.exports.Drawable = Drawable;
