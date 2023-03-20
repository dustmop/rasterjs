const baseDisplay = require('./base_display.js');

class AsciiDisplay extends baseDisplay.BaseDisplay {
  appLoop(runID, nextFrame) {
    let _res = this._renderer.render();
    let field = this._renderer.getFirstField();
    let buffer = field.data;
    let pitch = field.pitch;

    for (let y = 0; y < field.height; y++) {
      let line = '';
      for (let x = 0; x < field.width; x++) {
        let k = y * field.pitch + x;
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

