var _state = {
  pending: false,
  images: [],
};

function Image() {
  this.filepath = null;
  this.id = null;
  this.isOpen = false;
  this.slice = null;
  return this;
}

Image.prototype.copy = function(x, y, w, h) {
  let make = new Image();
  make.filepath = this.filepath;
  make.id = this.id;
  make.isOpen = this.isOpen;
  make.slice = [x, y, w, h];
  return make;
}

function NewImage(filepath) {
  let img = new Image();
  img.filepath = filepath;
  img.id = _state.images.length;
  _state.images.push(img);
  _state.pending = true;
  return img;
}

function readAll(envBackend) {
  if (!_state.pending) {
    return;
  }
  _state.pending = false;
  for (let i = 0; i < _state.images.length; i++) {
    let img = _state.images[i];
    if (!img.isOpen) {
      envBackend.readImage(img.filepath);
      img.isOpen = true;
    }
  }
}

module.exports.NewImage = NewImage;
module.exports.readAll = readAll;
