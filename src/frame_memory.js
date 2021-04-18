function NewFrameMemory(w, h) {
  var make = new Uint8Array(w * h);
  make.y_dim = h;
  make.x_dim = w;
  make.height = h;
  make.width = w;
  make.pitch = w;
  make._didFrame = false;
  make._backBuffer = null;
  make.put = function(x, y, v) {
    if (x < 0 || x >= this.x_dim || y < 0 || y >= this.y_dim) {
      return;
    }
    this[x + y*this.pitch] = v;
  };
  make.get = function(x, y) {
    if (x < 0 || x >= this.x_dim || y < 0 || y >= this.y_dim) {
      return 0;
    }
    return this[x + y*this.pitch];
  };
  make.getPrevious = function(x, y) {
    let k = x + y*this.pitch;
    if (this._backBuffer) {
      return this._backBuffer[x + y*this.pitch];
    }
    throw 'getPrevious only works if fillFrame is given {previous:true}';
  };
  make.createBackBuffer = function() {
    var self = this;
    if (self._backBuffer == null) {
      self._backBuffer = new Uint8Array(w * h);
    }
    self._backBuffer.set(self);
  }
  return make;
}

module.exports.NewFrameMemory = NewFrameMemory;
