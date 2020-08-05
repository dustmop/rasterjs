// html

var htmlRendererMake;

loadScript('canvas_methods.js', function() {
  var drawColor;
  htmlRendererMake = function() {
    var r = {
      initialize:   function() {},
      createWindow: function(width, height) {
        canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        document.body.appendChild(canvas);
        var c = document.getElementsByTagName('canvas')[0];
        c.style.width = width * 3;
        c.style.height = height * 3;
      },
      renderLoop: function(f) {
        requestAnimationFrame(function() {
          ctx = canvas.getContext('2d');
          f();
          r.renderLoop(f);
        });
      },
      fillBackground: fillBackground,
      assignRgbMapping: assignRgbMapping,
      setColor: setColor,
      drawPolygon: drawPolygon,
      drawLine: drawLine,
      drawRect: drawRect,
      drawCircleFromArc: drawCircleFromArc,
    };
    return r;
  }
});
