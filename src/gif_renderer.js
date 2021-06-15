const GIFEncoder = require('gifencoder');
const pngFileStream = require('png-file-stream');
const PNG = require("pngjs").PNG;
const fs = require('fs');
const os = require('os');
const path = require('path');
const util = require('util');
const randstr = require('randomstring');

function GifRenderer(targetPath, numFrames) {
  this.targetPath = targetPath;
  this.numFrames = numFrames;
  return this;
}

GifRenderer.prototype.initialize = function() {
  this.tmpdir = path.join(os.tmpdir(), 'qgfx-gif-' + randstr.generate(8));
}

GifRenderer.prototype.setSource = function(plane, zoomLevel) {
  this.plane = plane;
}

GifRenderer.prototype.renderLoop = function(nextFrame) {
  let width = this.plane.width;
  let height = this.plane.height;
  try {
    fs.mkdirSync(this.tmpdir);
  } catch (e) {
  }

  let numFrames = this.numFrames;
  if (!numFrames || numFrames < 0) {
    numFrames = 64;
  }

  // Render each frame, and write to a file in a tmp directory.
  let doneCount = 0;
  for (let count = 0; count < numFrames; count++) {
    nextFrame();
    let frameNum = leftPad(count, 3, '0');
    let rawBuffer = this.plane.asBuffer();
    let imgData = new Uint8Array(rawBuffer);
    let makePng = new PNG({width: width, height: height});
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let i = (width*y + x) * 4;
        // PNG are stored in reverse byte order.
        makePng.data[i+0] = imgData[i+3];
        makePng.data[i+1] = imgData[i+2];
        makePng.data[i+2] = imgData[i+1];
        makePng.data[i+3] = imgData[i+0];
      }
    }
    let filename = `${this.tmpdir}/${frameNum}.png`;
    makePng.pack().pipe(fs.createWriteStream(filename))
      .on('finish', function() {
        doneCount++;
      });
  }

  // Wait for each frame to render.
  let self = this;
  let waitToComplete = function() {
    if (doneCount < numFrames) {
      setImmediate(waitToComplete);
      return;
    }
    // Actually write the gif.
    const gifOpt = {repeat: 0, delay: 16, quality: 4};
    const encoder = new GIFEncoder(width, height);
    const stream = pngFileStream(self.tmpdir + '/*.png')
          .pipe(encoder.createWriteStream(gifOpt))
          .pipe(fs.createWriteStream(self.targetPath));
    stream.on('finish', function () {
      console.log(`wrote ${self.targetPath}`);
    });
    return;
  }
  waitToComplete();
}

function leftPad(value, size, fill) {
  fill = fill || ' ';
  let text = value.toString();
  while (text.length < size) {
    text = fill + text;
  }
  return text;
}

module.exports.GifRenderer = GifRenderer;
