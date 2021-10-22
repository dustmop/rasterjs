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
  make.copyTo = function(buffer, info) {
    for (let y = 0; y < info.height; y++) {
      for (let x = 0; x < info.width; x++) {
        let k = y*this.pitch + x;
        let j = y*info.pitch + x;
        buffer[j] = this[k];
      }
    }
  }
  make.from = function(buffer, info) {
    for (let y = 0; y < info.height; y++) {
      for (let x = 0; x < info.width; x++) {
        let k = y*this.pitch + x;
        let j = y*info.pitch + x;
        this[k] = buffer[j];
      }
    }
  }
  return make;
}

module.exports.NewFrameMemory = NewFrameMemory;
