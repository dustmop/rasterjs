function DisplayAscii() {
  this.renderer = null;
  return this;
}

DisplayAscii.prototype.initialize = function() {
}

DisplayAscii.prototype.setSize = function(width, height) {
  // pass
}

DisplayAscii.prototype.setSource = function(renderer, zoomLevel) {
  this.renderer = renderer;
}

DisplayAscii.prototype.renderLoop = function(nextFrame) {
  let plane = this.renderer.plane;
  let buffer = plane.data;
  let pitch = plane.pitch;
  for (let y = 0; y < plane.height; y++) {
    let line = '';
    for (let x = 0; x < plane.width; x++) {
      let k = y * plane.pitch + x;
      line += byteToAscii(buffer[k]);
    }
    line += '\n';
    process.stdout.write(line);
  }
}

let alphabet = (
  ' ._-=/|!^*%&' +
  'abcdefghijklmnopqrstuvwxyz' +
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ');

function byteToAscii(b) {
  return alphabet[b % 64];
}

module.exports.DisplayAscii = DisplayAscii;

