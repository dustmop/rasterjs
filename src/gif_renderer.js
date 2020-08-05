// node.js

const {createCanvas} = require('canvas');
const canvasMethods = require('./canvas_methods.js');
const fs = require('fs');
const os = require('os');
const path = require('path');
const util = require('util');
const randstr = require('randomstring');

var gifWidth;
var gifHeight;
var gifTmpdir;

function make(scriptFilename, opt) {
  var r = {
    initialize: function() {},
    createWindow: function(width, height) {
      gifWidth = parseInt(width, 10);
      gifHeight = parseInt(height, 10);
      gifTmpdir = path.join(os.tmpdir(), 'qgfx-gif-' + randstr.generate(8));
      try {
        fs.mkdirSync(gifTmpdir);
      } catch (e) {
      }
      console.log('tmp = "' + gifTmpdir + '"');
    },
    renderLoop: function(f) {
      let gifFilename = path.basename(scriptFilename, '.js') + '.gif';
      let numFrames = 64;
      if (opt && opt.numFrames) {
        numFrames = opt.numFrames;
      }
      for (var count = 0; count < numFrames; count++) {
        let canvas = createCanvas(gifWidth, gifHeight);
        canvasMethods.canvasInit(canvas);
        f();
        canvasMethods.canvasFinish();
        var n = count.toString();
        while (n.length < 3) {
          n = '0' + n;
        }
        const buffer = canvas.toBuffer();
        var filename = util.format('%s/%s.png', gifTmpdir, n);
        fs.writeFileSync(filename, buffer)
      }
      const gifOpt = {repeat: 0, delay: 16, quality: 10};
      const GIFEncoder = require('gifencoder');
      const encoder = new GIFEncoder(gifWidth, gifHeight);
      const pngFileStream = require('png-file-stream');
      const stream = pngFileStream(gifTmpdir + '/*.png')
            .pipe(encoder.createWriteStream(gifOpt))
            .pipe(fs.createWriteStream(gifFilename));
      stream.on('finish', function () {
        console.log('created!');
      });
    },
    fillBackground: canvasMethods.fillBackground,
    setColor: canvasMethods.setColor,
    drawPolygon: canvasMethods.drawPolygon,
    drawLine: canvasMethods.drawLine,
    drawRect: canvasMethods.drawRect,
    drawCircleFromArc: canvasMethods.drawCircleFromArc,
  };
  return r;
}

module.exports.make = make;
