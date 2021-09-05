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
  let pitch = this.plane.width;
  let line = '';
  for (let k = 0; k < buffer.length; k++) {
    if ((k > 0) && (k % pitch == 0)) {
      line += '\n';
      process.stdout.write(line);
      line = '';
    }
    line += byteToAscii(buffer[k]);
  }
  if (line != '') {
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

