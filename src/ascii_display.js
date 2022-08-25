class AsciiDisplay {
  constructor() {
    this.renderer = null;
    return this;
  }

  initialize() {
  }

  setSize(width, height) {
    // pass
  }

  setRenderer(renderer) {
    this.renderer = renderer;
  }

  setZoom(zoom) {
  }

  setGrid(state) {
    // pass
  }

  handleEvent(eventName, callback) {
    // ascii display does not use an event loop, so it can not handle
    // any events
  }

  renderLoop(nextFrame) {
    let _res = this.renderer.render();
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
}

let alphabet = (
  ' ._-=/|!^*%&' +
  'abcdefghijklmnopqrstuvwxyz' +
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ');

function byteToAscii(b) {
  return alphabet[b % 64];
}

module.exports.AsciiDisplay = AsciiDisplay;

