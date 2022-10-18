const baseDisplay = require('./base_display.js');

class AsciiDisplay extends baseDisplay.BaseDisplay {
  appLoop(runID, nextFrame) {
    let _res = this._renderer.render();
    let plane = this._renderer.getFirstPlane();
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
}

let alphabet = (
  ' ._-=/|!^*%&' +
  'abcdefghijklmnopqrstuvwxyz' +
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ');

function byteToAscii(b) {
  return alphabet[b % 64];
}

module.exports.AsciiDisplay = AsciiDisplay;

