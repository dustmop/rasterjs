const cppmodule = require('../build/Release/native');
const GIFEncoder = require('gifencoder');
const pngFileStream = require('png-file-stream');
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
    let outFile = `${this.tmpdir}/${frameNum}.png`;
    this.plane.save(outFile);
  }

  // Wait for each frame to render.
  if (this.isGif) {
    // Actually write the gif.
    const gifOpt = {repeat: 0, delay: 16, quality: 4};
    const encoder = new GIFEncoder(width, height);
    const stream = pngFileStream(this.tmpdir + '/*.png')
          .pipe(encoder.createWriteStream(gifOpt))
          .pipe(fs.createWriteStream(this.targetPath));
    stream.on('finish', function () {
      console.log(`wrote ${this.targetPath}`);
    });
    return;
  } else {
    // Copy the first frame to our target path.
    let infile = `${this.tmpdir}/000.png`;
    let outfile = this.targetPath;
    fs.copyFileSync(infile, outfile);
  }
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
