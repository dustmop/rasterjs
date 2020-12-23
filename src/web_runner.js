var _webRunnerMake = function() {
  var runner = {
    start: function(privData, startCallback) {
      //loadScript('destructure.js', function() {
        loadScript('/canvas_methods.js', function() {
          // Get rendering operations that were executed already
          let queuedCommands = privData.cmd;

          // Hook-up data to the real thing
          privData.cmd = {
            push: function(row) {
              _dispatchCommand(row);
            }
          }
          privData.methods = {
            run: function(renderFunc) {
              var eachFrame = function() {
                renderFunc();
                requestAnimationFrame(eachFrame);
              }
              eachFrame();
            },
          };
          privData.then = function(cb) {
            cb();
          }

          // Execute the queued methods
          for (let k = 0; k < queuedCommands.length; k++) {
            let cmd = queuedCommands[k];
            _dispatchCommand(cmd);
          }

          // Continue onto the rest of the code
          startCallback();
        });
      //});
    },
  }
  return runner;
}

let _ctx = null;

function _dispatchCommand(row) {
  let method = row[0];
  let params = row[1];

  if (method == 'setSize') {
    // TODO: destructure
    let width = params[0].w;
    let height = params[0].h;
    let zoom = 1;

    let canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    let divList = document.getElementsByTagName('div');
    if (divList.length > 0) {
      divList[0].appendChild(canvas);
    } else {
      document.body.appendChild(canvas);
    }
    var c = document.getElementsByTagName('canvas')[0];
    c.style.width = width * zoom;
    c.style.height = height * zoom;
    //m.canvasInit(canvas);

    _ctx = canvas.getContext('2d');
    _ctx.antialias = 'none';

    return;
  }

  if (method == 'setZoom') {
    // TODO
    return;
  }

  if (method == 'setTitle') {
    // TODO
    return;
  }

  if (method == 'setColor') {
    // TODO
    return;
  }

  if (method == 'originAtCenter') {
    // TODO
    return;
  }

  if (method == 'fillBackground') {

    _ctx.fillStyle = 'grey';
    _ctx.fillRect(0, 0, 256, 256);

    return;
  }

  if (method == 'drawLine') {
    let x0 = params[0];
    let y0 = params[1];
    let x1 = params[2];
    let y1 = params[3];

    x0 += 128;
    y0 += 128;
    x1 += 128;
    y1 += 128;

    _ctx.fillStyle = 'black';
    _ctx.strokeStyle = 'black';
    _ctx.beginPath();
    _ctx.moveTo(x0, y0);
    _ctx.lineTo(x1, y1);
    _ctx.stroke();

    return;
  }

  console.log(row);
}



        /*

        var drawColor;
        var canvas = null;
        var m = createCanvasMethods();


        var unused = {
          // TODO: FIXME
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
        }
        */
        /*
        var r = {
          cmd: {},
          methods: {},
          then: function() {
            throw 'idk!';
          },
        };*/
