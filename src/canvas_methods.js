function createCanvasMethods() {
  var ctx = null;
  var opt = {rgbList: null};
  var canvasMethods = {

    canvasInit: function(canvas) {
      ctx = canvas.getContext('2d');
      ctx.antialias = 'none';
    },

    canvasFinish: function(canvas) {
      ctx = null;
    },

    fillBackground: function(color) {
      ctx.fillStyle = 'grey';
      ctx.fillRect(0, 0, 256, 256);
    },

    assignRgbMapping: function(rgbList) {
      opt.rgbList = rgbList;
    },

    setColor: function(color) {
      let rgb = opt.rgbList[color];
      let r = (rgb / 0x10000) % 0x100;
      let g = (rgb / 0x100) % 0x100;
      let b = (rgb / 0x1) % 0x100;
      opt.drawColor = 'rgba(' + r + ',' + g + ',' + b + ',1.0)';
    },

    putPolygon: function(x, y, params) {
      ctx.fillStyle = opt.drawColor;
      ctx.strokeStyle = opt.drawColor;
      ctx.beginPath();
      var p = params[0];
      ctx.moveTo(Math.round(x + p[0]), Math.round(y + p[1]));
      for (var i = 1; i < params.length; i++) {
        var p = params[i];
        ctx.lineTo(Math.round(x + p[0]), Math.round(y + p[1]));
      }
      ctx.fill();
    },

    putLine: function(x0, y0, x1, y1) {
      ctx.fillStyle = opt.drawColor;
      ctx.strokeStyle = opt.drawColor;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    },

    putRect: function(x, y, w, h) {
      ctx.fillStyle = opt.drawColor;
      ctx.strokeStyle = opt.drawColor;
      ctx.fillRect(x, y, w, h);
    },

    putCircleFromArc: function(x, y, arc, inner) {
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
  };

  return canvasMethods;
}

if (typeof window === 'undefined') {
  // If running in node.js, export the create method
  module.exports.createCanvasMethods = createcanvasMethods;
}
