const algorithm = require('./algorithm.js');
const component = require('./component.js');
const drawable = require('./drawable.js');
const destructure = require('./destructure.js');
const types = require('./types.js');

class Plane extends component.Component {
  constructor() {
    super();
    this.clear();
    return this;
  }

  name() {
    return 'plane';
  }

  clear() {
    this.width = 0;
    this.height = 0;
    this.pitch = 0;
    this.data = null;
    this.mem = null;
    this.bgColor = 0;
    this.frontColor = 7;
    this.font = null;
    this._addMethods();
  }

  clone() {
    this._prepare();
    let make = new Plane();
    make.width = this.width;
    make.height = this.height;
    make.pitch = this.pitch;
    make.data = this.data;
    make.mem = this.mem;
    make.bgColor = this.bgColor;
    make.frontColor = this.frontColor;
    make.font = this.font;
    return make;
  }

  replace(other) {
    throw new Error('IMPLEMENT ME: replace');
  }

  setColor(color) {
    if (!types.isNumber(color)) {
      throw new Error(`plane.setColor needs integer`);
    }
    this.frontColor = Math.floor(color);
  }

  fillColor(color) {
    if (!types.isNumber(color)) {
      throw new Error(`plane.fillColor needs integer`);
    }
    color = Math.floor(color);
    this.bgColor = color;
    this._needErase = true;
    if (this.isSelection) {
      this._needErase = false;
      for (let y = 0; y < this.height; y++) {
        for (let x = 0; x < this.width; x++) {
          this.put(x, y, color);
        }
      }
    }
  }

  fullyResolve() {
    this._prepare();
  }

  _addMethods(shouldDestruct) {
    let self = this;
    let d = new drawable.Drawable();
    let methods = d.getMethods();
    for (let i = 0; i < methods.length; i++) {
      let [fname, paramSpec, converter, impl] = methods[i];
      // Use a scoped function in order to acquire the method's `arguments`
      this[fname] = function() {
        let args = Array.from(arguments);
        if (paramSpec === undefined) {
          throw new Error(`function ${fname} does not have parameter spec`);
        }
        let realArgs = args;
        if (shouldDestruct) {
          realArgs = destructure.from(fname, paramSpec, args, converter);
        }
        impl.bind(self).apply(self.plane, realArgs);
      }
    }
  }

  setSize(w, h) {
    // TODO: use destructure.from
    if (h === undefined) {
      h = w;
    }
    this.width = w;
    this.height = h;
    // TODO: Make this adjustment be semi-random instead
    this.pitch = w + 2;
  }

  resize(x, y) {
    let scaleX = x / this.width;
    let scaleY = y / this.height;
    return algorithm.nearestNeighbor(this, scaleX, scaleY);
  }

  _prepare() {
    if (this.data && !this._needErase) {
      return;
    }
    if (this.width == 0 || this.height == 0) {
      this.setSize(100, 100);
    }
    let numPixels = this.height * this.pitch;
    if (!this.data) {
      this.data = new Uint8Array(numPixels);
      this._needErase = true;
    }
    let c = this.bgColor;
    for (let k = 0; k < numPixels; k++) {
      this.data[k] = c;
    }
    this._needErase = false;
  }

  get(x, y) {
    if (x == null) { throw new Error(`get: x is null`); }
    if (y == null) { throw new Error(`get: y is null`); }
    this._prepare();
    this._offs = this.offsetTop * this.pitch + this.offsetLeft || 0;
    x = Math.floor(x);
    y = Math.floor(y);
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return null;
    }
    let k = y * this.pitch + x;
    return this.data[this._offs + k];
  }

  put(x, y, v) {
    if (x == null) { throw new Error(`put: x is null`); }
    if (y == null) { throw new Error(`put: y is null`); }
    this._prepare();
    this._offs = this.offsetTop * this.pitch + this.offsetLeft || 0;
    x = Math.floor(x);
    y = Math.floor(y);
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return;
    }
    let k = y * this.pitch + x;
    this.data[this._offs + k] = Math.floor(v);
  }

  fill(v) {
    this._prepare();
    if (types.isArray(v)) {
      let k = 0;
      for (let i = 0; i < this.height; i++) {
        for (let j = 0; j < this.width; j++) {
          this.put(j, i, v[k]);
          k++;
        }
      }
      return;
    }
    if (types.isNumber(v)) {
      for (let k = 0; k < this.data.length; k++) {
        this.data[k] = Math.floor(v);
      }
      return;
    }
    throw new Error(`plane.fill needs array or number, got ${v}`);
  }

  pack() {
    let newPitch = this.width;
    let numPixels = this.height * newPitch;
    let newBuff = new Uint8Array(numPixels);
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        let k = y*this.pitch + x;
        let j = y*newPitch + x;
        newBuff[j] = this.data[k];
      }
    }
    return newBuff;
  }

  xform(kind) {
    if (kind == 'hflip') {
      // TODO: get pitch from the env
      let newPitch = this.width;
      let numPixels = this.height * newPitch;
      let buff = new Uint8Array(numPixels);
      for (let y = 0; y < this.height; y++) {
        for (let x = 0; x < this.width; x++) {
          let j = y * newPitch + x;
          buff[j] = this.get(this.width - x - 1, y);
        }
      }
      let make = new Plane();
      make.data = buff;
      make.pitch = newPitch;
      make.width = this.width;
      make.height = this.height;
      return make;
    } else if (kind == 'vflip') {
      // TODO: get pitch from the env
      let newPitch = this.width;
      let numPixels = this.height * newPitch;
      let buff = new Uint8Array(numPixels);
      for (let y = 0; y < this.height; y++) {
        for (let x = 0; x < this.width; x++) {
          let j = y * newPitch + x;
          buff[j] = this.get(x, this.height - y - 1);
        }
      }
      let make = new Plane();
      make.data = buff;
      make.pitch = newPitch;
      make.width = this.width;
      make.height = this.height;
      return make;
    }
    throw new Error(`unknown xform: "${kind}"`);
  }

  putSequence(seq) {
    this._prepare();
    this._offs = this.offsetTop * this.pitch + this.offsetLeft || 0;
    // Get the current color
    let c = this.frontColor;
    // Each sequence
    for (let i = 0; i < seq.length; i++) {
      let elem = seq[i];
      if (elem.length == 2) {
        // Sequence of length 2 is a single point
        let x = Math.floor(elem[0]);
        let y = Math.floor(elem[1]);
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
          continue;
        }
        let k = y * this.pitch + x;
        // TODO: Add offsets
        this.data[this._offs + k] = c;
      } else if (elem.length == 4) {
        // Sequnce of length 4 is a range
        let x0 = Math.floor(elem[0]);
        let x1 = Math.floor(elem[1]);
        let y0 = Math.floor(elem[2]);
        let y1 = Math.floor(elem[3]);
        // Swap endpoints if needed
        if (x0 > x1) {
          let tmp = x0;
          x0 = x1;
          x1 = tmp;
        }
        if (y0 > y1) {
          let tmp = y0;
          y0 = y1;
          y1 = tmp;
        }
        // Range only goes straight horizontal or straight vertical
        if (x0 == x1) {
          if (x0 < 0 || x1 >= this.width) {
            continue;
          }
          if (y0 < 0) {
            y0 = 0;
          }
          if (y1 >= this.height) {
            y1 = this.height - 1;
          }
          let x = x0;
          for (let y = y0; y <= y1; y++) {
            let k = y * this.pitch + x;
            // TODO: Add offsets
            this.data[this._offs + k] = c;
          }
        } else if (y0 == y1) {
          if (y0 < 0 || y1 >= this.height) {
            continue;
          }
          if (x0 < 0) {
            x0 = 0;
          }
          if (x1 >= this.width) {
            x1 = this.width - 1;
          }
          let y = y0;
          for (let x = x0; x <= x1; x++) {
            let k = y * this.pitch + x;
            // TODO: Add offsets
            this.data[this._offs + k] = c;
          }
        }
      }
    }
  }

  putBlit(img, baseX, baseY) {
    this._prepare();
    let offsetTop = this.offsetTop || 0;
    let offsetLeft = this.offsetLeft || 0;
    let imageTop = img.offsetTop || 0;
    let imageLeft = img.offsetLeft || 0;
    let imageHeight = img.height;
    let imageWidth = img.width;
    let imagePitch = img.pitch;
    let imageData = img.data;
    let imageAlpha = img.alpha;
    if (this.data == null) {
      return;
    }
    baseX = Math.floor(baseX) + offsetLeft;
    baseY = Math.floor(baseY) + offsetTop;

    for (let b = 0; b < imageHeight; b++) {
      for (let a = 0; a < imageWidth; a++) {
        let y = b + imageTop;
        let x = a + imageLeft;
        let j = y*imagePitch + x;
        let putX = a + baseX;
        let putY = b + baseY;
        if (putX < 0 || putX >= this.width + offsetLeft ||
            putY < 0 || putY >= this.height + offsetTop) {
          continue;
        }
        let k = putY*this.pitch + putX;
        if (!imageAlpha || imageAlpha[j] >= 0x80) {
          this.data[k] = imageData[j];
        }
      }
    }
  }

  select(x, y, w, h, name) {
    let spec = ['x:i', 'y:i', 'w:i', 'h:i', 'name?s'];
    [x, y, w, h, name] = destructure.from('select', spec, arguments, null);

    let make = this.clone();
    make.offsetLeft = (this.offsetLeft || 0) + x;
    make.offsetTop  = (this.offsetTop || 0) + y;
    make.width  = w;
    make.height = h;
    make.isSelection = true;
    make.name = name || null;
    make._addMethods(true);

    return make;
  }

  fold(fname, paramList) {
    let params = {};
    for (let row of paramList) {
      params = Object.assign(params, row);
      this[fname].bind(this).call(this, params);
    }
  }

  serialize() {
    let data = [];
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        data.push(this.get(x, y));
      }
    }
    let obj = {
      "width": this.width,
      "height": this.height,
      "data": data,
    };
    return JSON.stringify(obj);
  }
}

module.exports.Plane = Plane;
