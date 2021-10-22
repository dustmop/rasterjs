function DisplayAscii() {
  this.plane = null;
  return this;
}

DisplayAscii.prototype.initialize = function() {
}

DisplayAscii.prototype.setSource = function(plane, zoomLevel) {
  this.plane = plane;
}

DisplayAscii.prototype.renderLoop = function(nextFrame) {
  let buffer = this.plane.data;
  let pitch = this.plane.pitch;
  for (let y = 0; y < this.plane.height; y++) {
    let line = '';
    for (let x = 0; x < this.plane.width; x++) {
      let k = y * this.plane.pitch + x;
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

