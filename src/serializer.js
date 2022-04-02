const plane = require('./plane.js');
const textLoader = require('./text_loader.js');
const colorSet = require('./color_set.js');
const renderer = require('./renderer.js');
const types = require('./types.js');

function Serializer() {
  return this;
}

Serializer.prototype.colorsToSurface = function(colorList, opt) {
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
  let colors = new colorSet.Set([]);
  colors.assign([]);

  // Draw the palette
  target.font = font;
  target.fillColor(colors.extendWith(0x606060));
  for (let k = 0; k < colorList.length; k++) {
    let rgbInt = colorList[k].toInt();
    let j = k % numX;
    let i = Math.floor(k / numX);
    let y = i * gridY;
    let x = j * gridX;
    target.setColor(colors.extendWith(rgbInt));
    target.fillRect(x + outerLeft, y + outerTop,
                    gridX - cellBetween, gridY - cellBetween);
    let v = k.toString();
    if (v.length < 2) {
      v = '0' + v;
    }
    if (this._isLightColor(colorList[k])) {
      target.setColor(colors.extendWith(0));
    } else {
      target.setColor(colors.extendWith(0xffffff));
    }
    if (textOpt == 'none') {
      // pass
    } else if (textOpt == 'vert') {
      let textX = x + textLeft + outerLeft;
      let textY = y + textTop + outerTop;
      target.drawText(`${v[0]}`, textX, textY);
      target.drawText(`${v[1]}`, textX, textY + 6);
    } else {
      target.drawText(`${v}`, x + textLeft + outerLeft, y + textTop + outerTop);
    }
  }

  // Components for rendering
  let components = {
    plane: target,
    _config: {
      width: target.width,
      height: target.height,
    },
    conf: {
      width: target.width,
      height: target.height,
    },
    colorSet: colors,
  };

  // Render it
  let rend = new renderer.Renderer();
  rend.connect(components);
  return rend.render();
}

Serializer.prototype._isLightColor = function(rgb) {
  if (types.isRGBColor(rgb)) {
    // pass
  } else if (types.isPaletteEntry(rgb)) {
    rgb = rgb.rgb;
  } else {
    throw new Error(`invalid type: ${rgb}`);
  }
  let total = rgb.r + rgb.g + rgb.b;
  let avg = total / 3;
  return avg > 0x80;
}

module.exports.Serializer = Serializer;
