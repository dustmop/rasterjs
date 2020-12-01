// html

var htmlRendererMake;

loadScript('canvas_methods.js', function() {
  var drawColor;
  htmlRendererMake = function() {
    var canvas = null;
    var m = createCanvasMethods();
    var r = {
      initialize:   function() {},
      createWindow: function(width, height, zoom) {
        canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        document.body.appendChild(canvas);
        var c = document.getElementsByTagName('canvas')[0];
        c.style.width = width * zoom;
        c.style.height = height * zoom;
        m.canvasInit(canvas);
      },
      appRenderAndLoop: function(f) {
        requestAnimationFrame(function() {
          f();
          r.appRenderAndLoop(f);
        });
      },
      fillBackground: m.fillBackground,
      assignRgbMapping: m.assignRgbMapping,
      setColor: m.setColor,
      putPolygon: m.putPolygon,
      putLine: m.putLine,
      putRect: m.putRect,
      putCircleFromArc: m.putCircleFromArc,
    };
    return r;
  }
});
