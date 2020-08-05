var ctx;
var opt = {rgbList: null};

function canvasInit(canvas) {
  ctx = canvas.getContext('2d');
  ctx.antialias = 'none';
}

function canvasFinish(canvas) {
  ctx = null;
}

function fillBackground(color) {
  ctx.fillStyle = 'grey';
  ctx.fillRect(0, 0, 256, 256);
}

function assignRgbMapping(rgbList) {
  opt.rgbList = rgbList;
}

function setColor(color) {
  let rgb = opt.rgbList[color];
  let r = (rgb / 0x10000) % 0x100;
  let g = (rgb / 0x100) % 0x100;
  let b = (rgb / 0x1) % 0x100;
  opt.drawColor = 'rgba(' + r + ',' + g + ',' + b + ',1.0)';
}

function round(f) {
  return Math.round(f);
}

function drawPolygon(x, y, params) {
  ctx.fillStyle = opt.drawColor;
  ctx.strokeStyle = opt.drawColor;
  ctx.beginPath();
  var p = params[0];
  ctx.moveTo(round(x + p[0]), round(y + p[1]));
  for (var i = 1; i < params.length; i++) {
    var p = params[i];
    ctx.lineTo(round(x + p[0]), round(y + p[1]));
  }
  ctx.fill();
}

function drawLine(x, y, x1, y1) {
  ctx.fillStyle = opt.drawColor;
  ctx.strokeStyle = opt.drawColor;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x1, y1);
  ctx.stroke();
}

function drawRect(x, y, w, h) {
  ctx.fillStyle = opt.drawColor;
  ctx.strokeStyle = opt.drawColor;
  ctx.fillRect(x, y, w, h);
}

function drawCircleFromArc(x, y, arc, inner) {
  ctx.fillStyle = opt.drawColor;
  ctx.strokeStyle = opt.drawColor;
  for (var i = 0; i < arc.length; i++) {
    var a = arc[i][0];
    var b = arc[i][1];
    if (!inner) {
      ctx.fillRect(x + a, y + b, 1, 1);
      ctx.fillRect(x + a, y - b, 1, 1);
      ctx.fillRect(x - a, y + b, 1, 1);
      ctx.fillRect(x - a, y - b, 1, 1);
      ctx.fillRect(x + b, y + a, 1, 1);
      ctx.fillRect(x + b, y - a, 1, 1);
      ctx.fillRect(x - b, y + a, 1, 1);
      ctx.fillRect(x - b, y - a, 1, 1);
    } else {
      var L = -1;
      if (i < inner.length) {
        L = inner[i][0]
      } else {
        L = b - 1;
      }
      drawLine(x + a, y + b, x + L, y + b);
      drawLine(x - a, y + b, x - L, y + b);
      drawLine(x + a, y - b, x + L, y - b);
      drawLine(x - a, y - b, x - L, y - b);
      drawLine(x + b, y + a, x + b, y + L);
      drawLine(x - b, y + a, x - b, y + L);
      drawLine(x + b, y - a, x + b, y - L);
      drawLine(x - b, y - a, x - b, y - L);
    }
  }
}

if (typeof window === 'undefined') {
  module.exports.canvasInit = canvasInit;
  module.exports.canvasFinish = canvasFinish;
  module.exports.fillBackground = fillBackground;
  module.exports.setColor = setColor;
  module.exports.drawLine = drawLine;
  module.exports.drawRect = drawRect;
  module.exports.drawPolygon = drawPolygon;
  module.exports.drawCircleFromArc = drawCircleFromArc;
}
