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
  let image = {
    palette: [],
    buffer: [],
    pitch: null,
  };
  // TODO: Bad to access the rawBuffer directly. Plane should have
  // a simpler method to get the 8-bit color data.
  this.plane.rawBuffer.retrieveTrueContent(image);
  let line = '';
  for (let k = 0; k < image.buffer.length; k++) {
    if ((k > 0) && (k % image.pitch == 0)) {
      line += '\n';
      process.stdout.write(line);
      line = '';
    }
    line += byteToAscii(image.buffer[k]);
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

