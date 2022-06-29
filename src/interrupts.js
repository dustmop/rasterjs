const serializer = require('./serializer.js');
const types = require('./types.js');


// Interrupts split up the rendering process into regions. These regions are
// delineated by scanlines. At each scanline, rendering stops, then the irq
// is called. This function should modify the components of the scene, such
// that the remainder of the rendering process is affected by that irq.
// By default, regions are stacked vertically, and scanlines are equivalent
// to the y-position. If a scanline is a range, the irq is called for each
// scanline in that range, passing the scanline number as the argument.
class Interrupts {
  constructor(arr, refScene) {
    this.arr = arr;
    this.xposTrack = null;
    this.length = this.arr.length;
    this.refScene = refScene;
    this._assertInterruptFields();
    return this;
  }

  _assertInterruptFields() {
    for (let k = 0; k < this.arr.length; k++) {
      let elem = this.arr[k];
      if (elem.scanline === undefined) {
        throw new Error(`useInterrupts element ${k} missing field 'scanline'`);
      }
      // TODO: scanline must be Number or [Number], and in ascending order
      if (!elem.irq) {
        throw new Error(`useInterrupts element ${k} missing field 'irq'`);
      }
      if (elem.irq.constructor.name != 'Function') {
        throw new Error(`useInterrupts element ${k}.irq must be function`);
      }
    }
  }

  serialize() {
    let scene = this.refScene.deref();
    let width = scene.width;
    let height = scene.height;
    if (!width || !height) {
      throw new Error('scene does not have width or height set');
    }
    let ser = new serializer.Serializer();
    return ser.interruptsToSurface(this.arr, this.xposTrack, width, height);
  }

  shiftDown(line, obj) {
    let startIndex = obj.startIndex;
    let endIndex = obj.endIndex || this.arr.length;
    let deltaValue = null;
    for (let k = startIndex; k < endIndex; k++) {
      let elem = this.arr[k];
      if (k == startIndex) {
        // first row of our subset
        deltaValue = line - elem.scanline;
      }
      if (types.isNumber(elem.scanline)) {
        elem.scanline = elem.scanline + deltaValue;
      } else if (types.isArray(elem.scanline)) {
        let first = elem.scanline[0];
        let second = elem.scanline[1];
        elem.scanline = [first + deltaValue, second + deltaValue];
      }
    }
  }

  get(i) {
    return this.arr[i];
  }
}


module.exports.Interrupts = Interrupts;
