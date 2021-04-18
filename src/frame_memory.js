function NewFrameMemory(w, h) {
  var make = new Uint8Array(w * h);
  make.y_dim = h;
  make.x_dim = w;
  make.height = h;
  make.width = w;
  make.pitch = w;
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
  make._back_buffer = null;
  make.getPrevious = function(x, y) {
    var self = this;
    if (!self._back_buffer) {
      var copy_size = self.y_dim * self.pitch;
      var copy = new Uint8Array(copy_size);
      for (var k = 0; k < copy_size; k++) {
        copy[k] = self[k];
      }
      self._back_buffer = copy;
    }
    return self._back_buffer[x + y*this.pitch];
  };
  return make;
}

module.exports.NewFrameMemory = NewFrameMemory;
