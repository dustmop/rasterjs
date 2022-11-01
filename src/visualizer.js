const plane = require('./plane.js');
const palette = require('./palette.js');
const rgbColor = require('./rgb_color.js');
const textLoader = require('./text_loader.js');
const renderer = require('./renderer.js');
const types = require('./types.js');


function addColor(colors, num) {
  let index = colors.length;
  colors.push(num);
  return index;
}


class Visualizer {
  constructor() {
    return this;
  }

  colorsToSurface(colorList, entries, opt) {
    opt = opt || {};

    let target = new plane.Plane();
    let numX = opt.row_size || 8;
    let numY = Math.ceil(colorList.length / numX);

    // Parameterize
    let cellWidth  = opt.cell_width || 15;
    let cellHeight = opt.cell_height || 13;
    let cellBetween = (opt.cell_between != undefined) ? opt.cell_between : 2;
    let outerTop  = (opt.outer_top != undefined) ? opt.outer_top : 3;
    let outerLeft = (opt.outer_left != undefined) ? opt.outer_left : 3;
    let textOpt = opt.text;

    // Constants from the font.
    let fontWidth = 7;
    let fontHeight = 5;
    if (textOpt == 'vert') {
      fontWidth = 3;
      fontHeight = 11;
    }

    // Calculate text location and grid size
    let textLeft = Math.floor((cellWidth - fontWidth) / 2);
    let textTop = Math.floor((cellHeight - fontHeight) / 2);
    let gridX = cellWidth + cellBetween;
    let gridY = cellHeight + cellBetween;

    // Calculate size of the whole plane
    let targetWidth  = numX * gridX - cellBetween + outerLeft * 2;
    let targetHeight = numY * gridY - cellBetween + outerTop * 2;
    target.setSize(targetWidth, targetHeight);

    // Create dependencies for drawing
    let loader = new textLoader.TextLoader();
    let font = loader.createFontResource('tiny');
    let colors = [];

    // Draw the palette
    target.font = font;
    target.fillColor(addColor(colors, 0x606060));
    for (let k = 0; k < colorList.length; k++) {
      let rgbInt = colorList[k];
      let j = k % numX;
      let i = Math.floor(k / numX);
      let y = i * gridY;
      let x = j * gridX;
      target.setColor(addColor(colors, rgbInt));
      target.fillRect(x + outerLeft, y + outerTop,
                      gridX - cellBetween, gridY - cellBetween);

      // number is either from entry's value, or is the index
      let num;
      if (entries) {
        num = entries[k];
      } else {
        num = k;
      }

      // hex, left pad with 0
      let digits = num.toString();
      if (digits.length < 2) {
        digits = '0' + digits;
      }
      // foreground color is the opposite of background color
      if (this._isLightColor(colorList[k])) {
        target.setColor(addColor(colors, 0));
      } else {
        target.setColor(addColor(colors, 0xffffff));
      }

      // draw the text
      if (textOpt == 'none') {
        // pass
      } else if (textOpt == 'vert') {
        let textX = x + textLeft + outerLeft;
        let textY = y + textTop + outerTop;
        target.drawText(`${digits[0]}`, textX, textY);
        target.drawText(`${digits[1]}`, textX, textY + 6);
      } else {
        let textX = x + textLeft + outerLeft;
        let textY = y + textTop + outerTop;
        target.drawText(`${digits}`, textX, textY);
      }
    }

    // Components for rendering
    let components = [{
      plane: target,
      palette: new palette.Palette({rgbmap: colors}),
    }];

    // Render it
    let rend = new renderer.Renderer();
    rend.connect(components);
    return rend.render();
  }

  attributesToSurface(source, sizeInfo, opt) {
    let srcWidth = source.width;
    let srcHeight = source.height;
    let srcPitch = source.pitch;
    let srcData = source.data;

    let sz = 22;

    let width = srcWidth * sz;
    let height = srcHeight * sz;
    let unit = sz;

    let target = new plane.Plane();
    target.setSize(width, height);
    target.fillColor(0);

    let colors = palette.constructRGBMapFrom('quick');

    for (let y = 0; y < srcHeight; y++) {
      for (let x = 0; x < srcWidth; x++) {
        let v = srcData[srcPitch*y + x];
        target.setColor(v + 24);
        target.fillRect(x*unit, y*unit, unit, unit);
      }
    }

    // Components for rendering
    let components = [{
      plane: target,
      palette: new palette.Palette({rgbmap: colors}),
    }];

    // Render it
    let rend = new renderer.Renderer();
    rend.connect(components);
    return rend.render();
  }

  interruptsToSurface(arr, xposTrack, width, height) {
    xposTrack = xposTrack || {};

    let target = new plane.Plane();
    target.setSize(Math.floor(width / 2), Math.floor(height / 2));
    target.fillColor(0);
    target.setColor(7);

    let colors = palette.constructRGBMapFrom('quick');

    let prev = 0;
    for (let row of arr) {
      // TODO: Clean me up
      let s = row.scanline;
      if (types.isNumber(s)) {
        target.setColor(7);
        target.drawLine(0, s / 2, width, s / 2);
        let x = (xposTrack[prev] || 0) % width;
        target.setColor(42);
        target.drawLine(x / 2, prev / 2, x / 2, s / 2);
        prev = s;
      } else {
        let x = (xposTrack[prev] || 0) % width;
        target.setColor(42);
        target.drawLine(x / 2, prev / 2, x / 2, s[0] / 2);
        for (let n = s[0]; n < s[1]; n++) {
          target.setColor(4);
          target.drawLine(0, n / 2, width, n / 2);
          let x = (xposTrack[prev] || 0);
          target.setColor(42);
          target.drawDot(x / 2, n / 2);
          prev = n;
        }
      }
    }
    let s = height;
    let x = (xposTrack[prev] || 0) % width;
    target.setColor(42);
    target.drawLine(x / 2, prev / 2, x / 2, s / 2);

    // Components for rendering
    let components = [{
      plane: target,
      palette: new palette.Palette({rgbmap: colors}),
    }];

    // Render it
    let rend = new renderer.Renderer();
    rend.connect(components);
    return rend.render();
  }

  _isLightColor(n) {
    let rgb = new rgbColor.RGBColor(n);
    let total = rgb.r + rgb.g + rgb.b;
    let avg = total / 3;
    return avg > 0x80;
  }
}

module.exports.Visualizer = Visualizer;
