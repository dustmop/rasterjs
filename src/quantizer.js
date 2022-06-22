const RgbQuant = require('rgbquant');
const rgbColor = require('./rgb_color');


// Quantizer reduces the number of colors in an image
class Quantizer {
  constructor() {
    this.useNumColors = 64;
    return this;
  }

  colorQuantize(rgbBuff) {
    let quant = new RgbQuant({
      colors: this.useNumColors,
      method: 1,
      initColors: 2048,
    });
    quant.sample(rgbBuff);
    let pal = quant.palette(true);
    let newColors = pal.map((it) => (it[0]*0x10000 + it[1]*0x100 + it[2]));
    let newRgbBuff = quant.reduce(rgbBuff);
    return {colors: newColors, rgbBuff: newRgbBuff};
  }
}


module.exports.Quantizer = Quantizer;
