function NewDirectMemory(w, h) {
  var make = new Uint8Array(w * h);
  make.y_dim = h;
  make.x_dim = w;
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
  return make;
}

module.exports.NewDirectMemory = NewDirectMemory;
