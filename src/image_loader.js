var _state = [];

function Image() {
  this.filepath = null;
  this.id = null;
  this.isOpen = false;
  this.slice = null;
  return this;
}

function NewImage(filepath) {
  let img = new Image;
  img.filepath = filepath;
  img.id = _state.length;
  _state.push(img);
  return img;
}

function loadAll(renderer) {
  for (let i = 0; i < _state.length; i++) {
    let img = _state[i];
    if (!img.isOpen) {
      renderer.loadImage(img.filepath);
      img.isOpen = true;
    }
  }
}

module.exports.NewImage = NewImage;
module.exports.loadAll = loadAll;
