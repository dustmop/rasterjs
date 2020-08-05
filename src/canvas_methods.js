var ctx;
var opt = {drawColor: null};

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

function setColor(color) {
  opt.drawColor = color;
}

function round(f) {
  return Math.round(f);
}

function drawPolygon(x, y, params) {
  ctx.fillStyle = 'white';
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
  ctx.fillStyle = 'red';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x1, y1);
  ctx.stroke();
}

function drawRect(x, y, w, h) {
  ctx.fillStyle = 'red';
  ctx.fillRect(x, y, w, h);
}

function drawCircleFromArc(x, y, arc, inner) {
  ctx.fillStyle = 'red';
  ctx.strokeStyle = 'rgba(255,0,0,1.0)';
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
