const drawing = require('./drawing.js');
//const rawBuff = require('./raw_buffer.js');

var _g_scene = null;

function Plane() {
  //this.rawBuffer = new rawBuff.RawBuffer();
  //this.colorSet = _g_scene.colorSet;
  //this.rawBuffer.useColors(this.colorSet);
  this.clear();
  this.scene = _g_scene;
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
  this.translateX = 0;
  this.translateY = 0;
  this.data = null;
  this.mem = null;
  this.rgbBuffer = null;
  this._backBuffer = null;
  this.bgColor = 0;
  this.frontColor = 7;
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
  this.pitch = w;
}

//Plane.prototype.trueBuffer = function() {
//  return this.rawBuffer.rawData();
//}

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
/*
  let old = this.dirtyState;
  if (this.dirtyState == D_DID_FILL || this.dirtyState == D_CLEAN) {
    this.dirtyState = D_CLEAN;
  } else {
    this.dirtyState = D_DRAWN;
  }
  if (this.mem) {
    this.mem._didFrame = false;
  }
*/
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

Plane.prototype.render = function() {
  this._prepare();
  let numPixels = this.height * this.pitch;
  if (this.rgbBuffer == null) {
    this.rgbBuffer = new Uint8Array(numPixels*4);
  }
  for (let y = 0; y < this.height; y++) {
    for (let x = 0; x < this.width; x++) {
      let k = y*this.pitch + x;
      let [r,g,b] = this._toColor(this.data[k]);
      this.rgbBuffer[k*4+0] = r;
      this.rgbBuffer[k*4+1] = g;
      this.rgbBuffer[k*4+2] = b;
      this.rgbBuffer[k*4+3] = 0xff;
    }
  }
  return this.rgbBuffer;
}

Plane.prototype._toColor = function(c) {
  let colors = this.scene.colorSet;
  let rgb = colors.get(c);
  let r = Math.floor(rgb / 0x10000) % 0x100;
  let g = Math.floor(rgb / 0x100) % 0x100;
  let b = Math.floor(rgb / 0x1) % 0x100;
  return [r, g, b];
}

Plane.prototype.save = function(savepath) {
  let buffer = this.render();
  // TODO: fix definition of pitch
  let pitch = this.width * 4;
  let saveService = this.scene.saveService;
  if (!saveService) {
    throw new Error('cannot save plane without save service');
  }
  saveService.saveTo(savepath, buffer, this.width, this.height, pitch);
}

module.exports.Plane = Plane;
module.exports.setGlobalScene = setGlobalScene;
