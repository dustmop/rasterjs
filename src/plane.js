const drawing = require('./drawing.js');
const destructure = require('./destructure.js');

var _g_scene = null;

function Plane() {
  this.clear();
  this.scene = _g_scene;
  return this;
}

function setGlobalScene(scene) {
  _g_scene = scene;
}

Plane.prototype.clear = function() {
  this.width = 0;
  this.height = 0;
  this.pitch = 0;
  this.data = null;
  this.mem = null;
  this.rgbBuffer = null;
  this._backBuffer = null;
  this.bgColor = 0;
  this.frontColor = 7;
  this._addMethods();
}

Plane.prototype.clone = function() {
  this._prepare();
  let make = new Plane();
  make.width = this.width;
  make.height = this.height;
  make.pitch = this.pitch;
  make.data = this.data;
  make.mem = this.mem;
  make.bgColor = this.bgColor;
  make.frontColor = this.frontColor;
  // rgbBuffer
  // _backBuffer
  // bgColor
  // frontColor
  return make;
}

Plane.prototype._addMethods = function(shouldDestruct) {
  let self = this;
  let d = new drawing.Drawing();
  let methods = d.getMethods();
  for (let i = 0; i < methods.length; i++) {
    let [fname, paramSpec, converter, impl] = methods[i];
    this[fname] = function() {
      let args = Array.from(arguments);
      if (paramSpec === undefined) {
        throw new Error(`function ${fname} does not have parameter spec`);
      }
      let realArgs = args;
      if (shouldDestruct) {
        realArgs = destructure.from(fname, paramSpec, args, converter);
      }
      impl.bind(self).apply(self.aPlane, realArgs);
    }
  }
}

Plane.prototype.setSize = function(w, h) {
  // TODO: use destructure.from
  if (h === undefined) {
    h = w;
  }
  this.width = w;
  this.height = h;
  // TODO: Make this adjustment be semi-random instead
  this.pitch = w + 2;
}

Plane.prototype.nextFrame = function() {
  if (this.mem) {
    this.mem._didFrame = false;
  }
}

Plane.prototype._prepare = function() {
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

Plane.prototype.get = function(x, y) {
  this._prepare();
  this._offs = this.offsetTop * this.pitch + this.offsetLeft || 0;
  let k = y * this.pitch + x;
  return this.data[this._offs + k];
}

Plane.prototype.put = function(x, y, v) {
  this._prepare();
  this._offs = this.offsetTop * this.pitch + this.offsetLeft || 0;
  let k = y * this.pitch + x;
  // TODO: Check width and height
  this.data[this._offs + k] = v;
}

Plane.prototype.putSequence = function(seq) {
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

Plane.prototype.putImage = function(img, baseX, baseY) {
  this._prepare();
  let imageTop = img.top;
  let imageLeft = img.left;
  let imageHeight = img.height;
  let imageWidth = img.width;
  let imagePitch = img.pitch;
  let imageData = img.data;
  let imageAlpha = img.alpha;
  if (this.data == null) {
    return;
  }
  baseX = Math.floor(baseX);
  baseY = Math.floor(baseY);
  for (let y = imageTop; y < imageHeight; y++) {
    for (let x = imageLeft; x < imageWidth; x++) {
      let j = y*imagePitch + x;
      let putX = x + baseX;
      let putY = y + baseY;
      if (putX < 0 || putX >= this.width ||
          putY < 0 || putY >= this.height) {
        continue;
      }
      let k = putY*this.pitch + putX;
      if (imageAlpha && imageAlpha[j] >= 0x80) {
        // TODO: this._offs
        this.data[k] = imageData[j];
      }
    }
  }
}

Plane.prototype.render = function() {
  this._prepare();
  return this.scene.render(this);
}

module.exports.Plane = Plane;
module.exports.setGlobalScene = setGlobalScene;
