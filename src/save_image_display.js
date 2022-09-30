const baseDisplay = require('./base_display.js');
const cppmodule = require('../build/Release/native');
const GIFEncoder = require('gif-encoder-2');
const { createWriteStream, readdirSync } = require('fs');
const { createCanvas, loadImage, ImageData } = require('canvas')
const pngFileStream = require('png-file-stream');
const fs = require('fs');
const os = require('os');
const path = require('path');
const util = require('util');
const randstr = require('randomstring');
const algorithm = require('./algorithm');

class SaveImageDisplay extends baseDisplay.BaseDisplay {
  constructor(targetPath, numFrames, fsacc) {
    super();
    this.targetPath = targetPath;
    this._numFrames = numFrames;
    this.isGif = this.targetPath.endsWith('gif');
    this._fsacc = fsacc;
    this._zoomLevel = 1;
  }

  initialize() {
    this._tmpdir = path.join(os.tmpdir(), 'raster-save-' + randstr.generate(8));
  }

  renderLoop(runID, nextFrame) {
    let width = this._width;
    let height = this._height;

    try {
      fs.mkdirSync(this._tmpdir);
    } catch (e) {
    }

    this._quit = false;
    let hasTemplate = false;

    let numFrames = this._numFrames;
    if (!numFrames || numFrames < 0) {
      numFrames = 64;
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
      if (this.stopRunning) {
        break;
      }
      nextFrame();
      let frameNum = leftPad(count, 3, '0');
      let outFile = `${this._tmpdir}/${frameNum}.png`;
      let renderedLayers = this._renderer.render();

      let targetWidth = this._width * this._zoomLevel;
      let targetHeight = this._height * this._zoomLevel;
      let create = algorithm.makeSurface(targetWidth, targetHeight);

      for (let i = 0; i < renderedLayers.length; i++) {
        let surface = renderedLayers[i];
        if (surface == null) {
          continue;
        } else if (this._zoomLevel > 1) {
          surface = algorithm.nearestNeighborSurface(surface, this._zoomLevel);
        }
        algorithm.mergeIntoSurface(create, surface);
      }
      let surface = renderedLayers.grid;
      if (surface) {
        algorithm.mergeIntoSurface(create, surface);
      }

      this._fsacc.saveTo(outFile, [create]);
      bufferList.push(create.buff);
      this._renderer.flushBuffer();
    }

    // Wait for each frame to render.
    if (this.isGif) {
      // Actually write the gif.
      const self = this;
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

    const writeStream = createWriteStream(outName)
    // when stream closes GIF is created so resolve promise
    writeStream.on('close', () => {
      console.log(`wrote ${outName}`);
    })

    encoder.createReadStream().pipe(writeStream);
    encoder.setDelay(16);
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
