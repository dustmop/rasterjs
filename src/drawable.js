const algorithm = require('./algorithm.js');
const geometry = require('./geometry.js');
const types = require('./types.js');

class Drawable {

  getMethods() {
    let result = [];
    let propertyNames = Object.getOwnPropertyNames(Object.getPrototypeOf(this));
    for (let fname of propertyNames) {
      if (fname.endsWith('_params')) { continue; }
      let pname = fname + '_params';
      let cname = fname + '_convert';
      if (this[pname]) {
        result.push([fname, this[pname], this[cname], this[fname]]);
      }
    }
    return result;
  }

  drawLine_params = ['x0:n', 'y0:n', 'x1:n', 'y1:n', 'cc?b'];
  drawLine(x0, y0, x1, y1, cc) {
    this._prepare();
    cc = cc ? 1 : 0;
    let res = algorithm.renderLine(this, x0, y0, x1, y1, cc);
    this.putSequence(res);
  }

  drawDot_params = ['x:i', 'y:i'];
  drawDot(x, y) {
    let put = [[x, y]];
    this.putSequence(put);
  }

  fillPattern_params = ['dots:any'];
  fillPattern(dots) {
    if (!types.is2dNumArray(dots)) {
      throw new Error(`fillPattern needs a 2d array, got ${dots}`);
    }

    this._prepare();
    let buffer = this.data;
    let left = this.offsetLeft || 0;
    let top = this.offsetTop || 0;
    let patHeight = dots.length;
    let patWidth = dots[0].length;

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        let i = y % patHeight;
        let j = x % patWidth;
        buffer[(y+top)*this.pitch+(x+left)] = dots[i][j];
      }
    }
  }

  fillSquare_params = ['x:i', 'y:i', 'size:i'];
  fillSquare(x, y, size) {
    if (Math.abs(size) < 0.5) {
      return;
    }
    _renderRect(this, x, y, size, size, true);
  }

  drawSquare_params = ['x:i', 'y:i', 'size:i'];
  drawSquare(x, y, size) {
    if (Math.abs(size) < 0.5) {
      return;
    }
    _renderRect(this, x, y, size, size, false);
  }

  fillRect_params = ['x:i', 'y:i', 'w:i', 'h:i', '||',
                     'x0:i', 'y0:i', 'x1:i', 'y1:i'];
  fillRect_convert(choice, vals) {
    return [vals[0], vals[1], vals[2] - vals[0], vals[3] - vals[1]];
  }
  fillRect(x, y, w, h) {
    _renderRect(this, x, y, w, h, true);
  }

  drawRect_params = ['x:i', 'y:i', 'w:i', 'h:i', '||',
                                        'x0:i', 'y0:i', 'x1:i', 'y1:i'];
  drawRect_convert(_choice, vals) {
    return [vals[0], vals[1], vals[2] - vals[0], vals[3] - vals[1]];
  }
  drawRect(x, y, w, h) {
    _renderRect(this, x, y, w, h, false);
  }

  fillCircle_params = ['x:i', 'y:i', 'r:n', '||',
                       'centerX:i', 'centerY:i', 'r:n'];
  fillCircle_convert(_choice, vals) {
    return [vals[0]-vals[2]+0.5, vals[1]-vals[2]+0.5, vals[2]];
  }
  fillCircle(x, y, r) {
    let centerX = x + r;
    let centerY = y + r;
    let arc = algorithm.midpointCircleRasterize(r);
    let half = algorithm.isHalfwayValue(r);
    let put = algorithm.renderCircle(centerX, centerY, arc, null, true, half);
    this.putSequence(put);
  }

  drawCircle_params = ['x:i', 'y:i', 'r:n', 'thick?i', '||',
                       'centerX:i', 'centerY:i', 'r:n', 'thick?i'];
  drawCircle_convert(_choice, vals) {
    return [vals[0]-vals[2], vals[1]-vals[2], vals[2], vals[3]];
  }
  drawCircle(x, y, r, thick) {
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

  fillPolygon_params = ['points:ps', 'x?i', 'y?i'];
  fillPolygon(polygon, x, y) {
    x = x || 0;
    y = y || 0;
    let points = geometry.convertToPoints(polygon);
    let res = algorithm.renderPolygon(this, x, y, points, true);
    this.putSequence(res);
  }

  drawPolygon_params = ['points:ps', 'x?i', 'y?i'];
  drawPolygon(polygon, x, y) {
    x = x || 0;
    y = y || 0;
    let points = geometry.convertToPoints(polygon);
    let res = algorithm.renderPolygon(this, x, y, points, false);
    this.putSequence(res);
  }

  fillFlood_params = ['x:i', 'y:i'];
  fillFlood(x, y) {
    this._prepare();
    algorithm.flood(this, x, y, this.frontColor);
  }

  fillFrame_params = ['options?o', 'fillerFunc:f'];
  fillFrame(options, fillerFunc) {
    // validate options given
    if (options) {
      types.ensureKeys(options, ['traverse', 'buffer']);
    }

    // validate traverse option
    let traverseRows = true;
    if (options && options.traverse) {
      if (options.traverse == 'rowwise') {
        traverseRows = true;
      } else if (options.traverse == 'columnar') {
        traverseRows = false;
      } else {
        throw Error(`invalid {traverse: ${option.traverse}}`);
      }
    }

    // validate callback
    if (fillerFunc.length != 2) {
      throw Error('invalid callback: wants 2 params, got ${fillerFunc.length}');
    }

    this._prepare();
    let buffer = this.data;
    let _replaceBuffer = null;

    if (options && options.buffer) {
      _replaceBuffer = new Array(this.data.length);
      _replaceBuffer.fill(null);
      buffer = _replaceBuffer;
    }

    let top = this.offsetTop || 0;
    let left = this.offsetLeft || 0;

    if (traverseRows) {
      for (let y = 0; y < this.height; y++) {
        for (let x = 0; x < this.width; x++) {
          let ret = fillerFunc(x, y);
          if (ret !== null && ret !== undefined) {
            buffer[(x+left) + (y+top)*this.pitch] = ret;
          }
        }
      }
    } else {
      for (let x = 0; x < this.width; x++) {
        for (let y = 0; y < this.height; y++) {
          let ret = fillerFunc(x, y);
          if (ret !== null && ret !== undefined) {
            buffer[(x+left) + (y+top)*this.pitch] = ret;
          }
        }
      }
    }

    if (_replaceBuffer) {
      for (let y = 0; y < this.height; y++) {
        for (let x = 0; x < this.width; x++) {
          let v = _replaceBuffer[(x+left) + (y+top)*this.pitch];
          if (v !== null) {
            this.data[(x+left) + (y+top)*this.pitch] = v;
          }
        }
      }
    }
  }

  paste_params = ['source:a', 'x?i', 'y?i'];
  paste(source, x, y) {
    if (!source.data) {
      let msg = 'paste: source has not been read, use ra.then to wait for it.';
      if (source.filename) {
        msg += ` filename: "${source.filename}"`;
      }
      throw new Error(msg);
    }
    if (x == null && y == null && !this.width && !this.height) {
      this.setSize(source.width, source.height);
    }
    x = x || 0;
    y = y || 0;
    this.putBlit(source, x, y);
  }

  drawText_params = ['text:s', 'x:i', 'y:i'];
  drawText(text, x, y) {
    let font = this.font;
    if (!font) {
      throw new Error('drawText: no font has been assigned');
    }
    if (!font.glyphs) {
      throw new Error('drawText: font has been opened, but not yet read');
    }

    let put = [];
    let cursor = 0;

    for (let ch of text) {
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
      put.push([x, x1, n, n]);
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

module.exports.Drawable = Drawable;
