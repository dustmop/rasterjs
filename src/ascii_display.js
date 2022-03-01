function AsciiDisplay() {
  this.renderer = null;
  return this;
}

AsciiDisplay.prototype.initialize = function() {
}

AsciiDisplay.prototype.setSize = function(width, height) {
  // pass
}

AsciiDisplay.prototype.setRenderer = function(renderer) {
  this.renderer = renderer;
}

AsciiDisplay.prototype.setZoom = function(zoom) {
}

AsciiDisplay.prototype.setGrid = function(unit) {
}

AsciiDisplay.prototype.renderLoop = function(nextFrame) {
  let plane = this.renderer.getFirstPlane();
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

module.exports.AsciiDisplay = AsciiDisplay;

