const drawing = require('./drawing.js');
const standalone = require('./standalone.js');

var _g_scene = null;

function Plane() {
  this.clear();
  this.scene = _g_scene;
  // TODO: Don't do this for every plane.
  this._addMethods();
  return this;
}

function setGlobalScene(scene) {
  _g_scene = scene;
}

Plane.prototype.clear = function() {
  this.width = 100;
  this.height = 100;
  this.pitch = this.width;
  // TODO: Move to scene or runner (drawMethods wrapper)
  this.translateX = 0;
  this.translateY = 0;
  this.data = null;
  this.mem = null;
  this.rgbBuffer = null;
  this._backBuffer = null;
  this.bgColor = 0;
  this.frontColor = 7;
}

Plane.prototype.clone = function() {
  let make = new Plane();
  make.width = this.width;
  make.height = this.height;
  make.pitch = this.pitch;
  make.translateX = this.translateX;
  make.translateY = this.translateY;
  make.data = this.data;
  make.mem = this.mem;
  // rgbBuffer
  // _backBuffer
  // bgColor
  // frontColor
  return make;
}

Plane.prototype._addMethods = function() {
  let self = this;
  let d = new drawing.Drawing();
  let methods = d.getMethods();
  for (let i = 0; i < methods.length; i++) {
    let [fname, params, impl] = methods[i];
    this[fname] = function() {
      let args = Array.from(arguments);
      impl.apply(this, args);
    }
  }
}

Plane.prototype._setSize = function(w, h) {
  this.width = w;
  this.height = h;
  // TODO: Make this adjustment be semi-random instead
  this.pitch = w + 2;
}

Plane.prototype.useColors = function(rep) {
  // TODO: Plane doesn't use this at all, move to scene only?
  this.scene.colorSet.use(rep);
}

Plane.prototype.setTranslation = function(relPos) {
  this.translateX = Math.floor(this.width * relPos);
  this.translateY = Math.floor(this.height * relPos);
}

Plane.prototype._getTranslation = function() {
  return [this.translateX, this.translateY];
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
  let k = y * this.pitch + x;
  return this.data[k];
}

Plane.prototype.put = function(x, y, v) {
  this._prepare();
  let k = y * this.pitch + x;
  this.data[k] = v;
}

Plane.prototype.putSequence = function(seq) {
  this._prepare();
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
      this.data[k] = c;
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
          this.data[k] = c;
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
          this.data[k] = c;
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
        this.data[k] = imageData[j];
      }
    }
  }
}

Plane.prototype.useStandalone = function() {
  this.scene = new standalone.Standalone();
}

Plane.prototype.render = function() {
  this._prepare();
  return this.scene.render(this);
}

Plane.prototype.save = function(savepath) {
  let buffer = this.render();
  let width = this.width;
  let height = this.height;
  let pitch = this.width * 4;
  if (buffer.width) {
    width = buffer.width;
    height = buffer.height;
    pitch = buffer.pitch;
  }
  let saveService = this.scene.saveService;
  if (!saveService) {
    throw new Error('cannot save plane without save service');
  }
  saveService.saveTo(savepath, buffer, width, height, pitch);
}

module.exports.Plane = Plane;
module.exports.setGlobalScene = setGlobalScene;
