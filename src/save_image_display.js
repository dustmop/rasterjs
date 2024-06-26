const baseDisplay = require('./base_display.js');
const compositor = require('./compositor.js');
const GIFEncoder = require('gif-encoder-2');
const { createWriteStream, readdirSync } = require('fs');
const { createCanvas, loadImage, ImageData } = require('canvas')
const fs = require('fs');
const os = require('os');
const path = require('path');
const util = require('util');
const randstr = require('randomstring');


class SaveImageDisplay extends baseDisplay.BaseDisplay {
  constructor(targetPath, numFrames, fsacc) {
    super();
    this.targetPath = targetPath;
    this._numFrames = numFrames;
    this.isGif = this.targetPath.endsWith('gif');
    this._fsacc = fsacc;
    this._zoomLevel = 1;
    this._slowdown = null;
  }

  name() {
    return 'save-image';
  }

  initialize() {
    this._tmpdir = path.join(os.tmpdir(), 'raster-save-' + randstr.generate(8));
  }

  beginExec(refExec) {
    let exec = refExec.deref();
    exec.setLockTime(true);
    let scene = exec.refOwner.deref();
    this._slowdown = scene.slowdown ?? 1.0;
    scene.slowdown = null;
  }

  appLoop(runID, execNextFrame) {
    let width = this._width;
    let height = this._height;

    try {
      fs.mkdirSync(this._tmpdir);
    } catch (e) {
    }

    let hasTemplate = false;

    let numFrames = this._numFrames;
    if (!numFrames || numFrames < 0) {
      numFrames = 60;
    }
    if (!this.isGif) {
      if (this._numFrames > 1) {
        if (!this.targetPath.includes('%02d')) {
          throw new Error(`saving a png to multiple frames requires template string, use "%02d" for --save`)
        }
        hasTemplate = true;
      } else {
        numFrames = 1;
      }
    }

    // Render each frame, and write to a file in a tmp directory.
    let bufferList = [];
    let doneCount = 0;
    for (let count = 0; count < numFrames; count++) {
      // TODO: Is this
      if (!this.isRunning()) {
        break;
      }
      execNextFrame();
      let frameNum = leftPad(count, 3, '0');
      let outFile = `${this._tmpdir}/${frameNum}.png`;
      let surfaces = this._renderer.render();

      let comp = new compositor.Compositor();
      let combined = comp.combine(surfaces, this._width, this._height,
                                  this._zoomLevel);
      this._fsacc.saveTo(outFile, combined);
      bufferList.push(combined[0].buff);
      this._renderer.flushBuffer();
    }

    // Wait for each frame to render.
    if (this.isGif) {
      // Actually write the gif.
      this.createGif(width*this._zoomLevel, height*this._zoomLevel,
                     bufferList, this.targetPath);
    } else if (!hasTemplate) {
      // Copy the first frame to our target path.
      let infile = `${this._tmpdir}/000.png`;
      let outfile = this.targetPath;
      fs.copyFileSync(infile, outfile);
    } else {
      // Multiple frames
      for (let count = 0; count < numFrames; count++) {
        let frameNum = leftPad(count, 3, '0');
        let param = leftPad(count, 2, '0');
        let infile = `${this._tmpdir}/${frameNum}.png`;
        let outfile = this.targetPath.replace('%02d', param);
        fs.copyFileSync(infile, outfile);
      }
    }
  }

  createGif(width, height, frames, outName) {
    const encoder = new GIFEncoder(width, height, 'octree', false, frames.length);

    const writeStream = createWriteStream(outName);
    // when stream closes GIF is created so resolve promise
    writeStream.on('close', () => {
      console.log(`wrote ${outName}`);
    })

    encoder.createReadStream().pipe(writeStream);
    encoder.setDelay(16.667 * this._slowdown);
    encoder.start();

    let canvas = createCanvas(width, height);
    let ctx = canvas.getContext('2d');

    for (let i = 0; i < frames.length; i++) {
      let f = frames[i];
      let carr = new Uint8ClampedArray(f);
      let image = new ImageData(carr, width, height);
      ctx.putImageData(image, 0, 0);
      encoder.addFrame(ctx);
    }
    encoder.finish();
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

module.exports.SaveImageDisplay = SaveImageDisplay;
