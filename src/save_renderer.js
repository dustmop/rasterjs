const cppmodule = require('../build/Release/native');
const GIFEncoder = require('gifencoder');
const pngFileStream = require('png-file-stream');
const fs = require('fs');
const os = require('os');
const path = require('path');
const util = require('util');
const randstr = require('randomstring');

function SaveRenderer(targetPath, numFrames, saveService) {
  this.targetPath = targetPath;
  this.numFrames = numFrames;
  this.isGif = this.targetPath.endsWith('gif');
  this.saveService = saveService;
  return this;
}

SaveRenderer.prototype.initialize = function() {
  this.tmpdir = path.join(os.tmpdir(), 'raster-save-' + randstr.generate(8));
}

SaveRenderer.prototype.setSize = function(w, h) {
  this.width = w;
  this.height = h;
}

SaveRenderer.prototype.setSource = function(renderer, zoomLevel) {
  this.renderer = renderer;
}

SaveRenderer.prototype.renderLoop = function(nextFrame) {
  let width = this.width;
  let height = this.height;
  // TODO: Saving a gif using a tileset does not work.

  try {
    fs.mkdirSync(this.tmpdir);
  } catch (e) {
  }

  let hasTemplate = false;

  let numFrames = this.numFrames;
  if (!numFrames || numFrames < 0) {
    numFrames = 64;
  }
  if (!this.isGif) {
    if (this.numFrames) {
      if (!this.targetPath.includes('%02d')) {
        throw new Error(`saving a png to multiple frames requires template string, use "%02d" for --save`)
      }
      hasTemplate = true;
    } else {
      numFrames = 1;
    }
  }

  // Render each frame, and write to a file in a tmp directory.
  let doneCount = 0;
  for (let count = 0; count < numFrames; count++) {
    nextFrame();
    let frameNum = leftPad(count, 3, '0');
    let outFile = `${this.tmpdir}/${frameNum}.png`;
    let pl = this.renderer.plane;
    pl._prepare();
    this.renderer.configure(pl.scene);
    let [width, height] = this.renderer.size();
    let buff = this.renderer.render();
    let pitch = pl.width*4;
    if (buff.pitch) {
      pitch = buff.pitch;
    }
    this.saveService.saveTo(outFile, buff, width, height, pitch);
  }

  // Wait for each frame to render.
  if (this.isGif) {
    // Actually write the gif.
    const self = this;
    const gifOpt = {repeat: 0, delay: 16, quality: 4};
    const encoder = new GIFEncoder(width, height);
    const stream = pngFileStream(this.tmpdir + '/*.png')
          .pipe(encoder.createWriteStream(gifOpt))
          .pipe(fs.createWriteStream(this.targetPath));
    stream.on('finish', function () {
      console.log(`wrote ${self.targetPath}`);
    });
    return;
  } else if (!hasTemplate) {
    // Copy the first frame to our target path.
    let infile = `${this.tmpdir}/000.png`;
    let outfile = this.targetPath;
    fs.copyFileSync(infile, outfile);
  } else {
    // Multiple frames
    for (let count = 0; count < numFrames; count++) {
      let frameNum = leftPad(count, 3, '0');
      let param = leftPad(count, 2, '0');
      let infile = `${this.tmpdir}/${frameNum}.png`;
      let outfile = this.targetPath.replace('%02d', param);
      fs.copyFileSync(infile, outfile);
    }
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
