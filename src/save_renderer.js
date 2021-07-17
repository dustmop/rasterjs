const GIFEncoder = require('gifencoder');
const pngFileStream = require('png-file-stream');
const PNG = require("pngjs").PNG;
const fs = require('fs');
const os = require('os');
const path = require('path');
const util = require('util');
const randstr = require('randomstring');

function SaveRenderer(targetPath, numFrames) {
  this.targetPath = targetPath;
  this.numFrames = numFrames;
  this.isGif = this.targetPath.endsWith('gif');
  return this;
}

SaveRenderer.prototype.initialize = function() {
  this.tmpdir = path.join(os.tmpdir(), 'raster-save-' + randstr.generate(8));
}

SaveRenderer.prototype.setSource = function(plane, zoomLevel) {
  this.plane = plane;
}

SaveRenderer.prototype.renderLoop = function(nextFrame) {
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
  if (!this.isGif) {
    numFrames = 1;
  }

  // Render each frame, and write to a file in a tmp directory.
  let doneCount = 0;
  for (let count = 0; count < numFrames; count++) {
    nextFrame();
    let frameNum = leftPad(count, 3, '0');
    let imgData = this.plane.trueBuffer();
    // TODO: Somewhat of a hack.
    let type = imgData.constructor.name;
    if (type == 'ArrayBuffer') {
      imgData = new Uint8Array(imgData);
    }
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
    if (self.isGif) {
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
    } else {
      // Copy the first frame to our target path.
      let infile = `${self.tmpdir}/000.png`;
      let outfile = self.targetPath;
      fs.copyFileSync(infile, outfile);
    }
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

module.exports.SaveRenderer = SaveRenderer;
