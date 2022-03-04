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

function SaveImageDisplay(targetPath, numFrames, saveService) {
  this.targetPath = targetPath;
  this.numFrames = numFrames;
  this.isGif = this.targetPath.endsWith('gif');
  this.saveService = saveService;
  this.zoomLevel = 1;
  this.gridUnit = 0;
  return this;
}

SaveImageDisplay.prototype.initialize = function() {
  this.tmpdir = path.join(os.tmpdir(), 'raster-save-' + randstr.generate(8));
}

SaveImageDisplay.prototype.setSize = function(w, h) {
  this.width = w;
  this.height = h;
}

SaveImageDisplay.prototype.setRenderer = function(renderer) {
  this.renderer = renderer;
}

SaveImageDisplay.prototype.setZoom = function(zoomLevel) {
  this.zoomLevel = zoomLevel;
}

SaveImageDisplay.prototype.setGrid = function(unit) {
  this.gridUnit = unit;
}

SaveImageDisplay.prototype.handleEvent = function(eventName, callback) {
  // save image display does not use an event loop, so it can
  // not handle any events
}

SaveImageDisplay.prototype.renderLoop = function(nextFrame) {
  let width = this.width;
  let height = this.height;

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
  let bufferList = [];
  let doneCount = 0;
  for (let count = 0; count < numFrames; count++) {
    nextFrame();
    let frameNum = leftPad(count, 3, '0');
    let outFile = `${this.tmpdir}/${frameNum}.png`;
    let res = this.renderer.render();
    let surface = res[0];
    if (this.zoomLevel > 1) {
      surface = algorithm.nearestNeighborSurface(surface, this.zoomLevel);
      res[0] = surface;
    }
    if (this.gridUnit > 0) {
      let spacing = this.zoomLevel * this.gridUnit;
      this._overlayGrid(surface, spacing);
    }
    this.saveService.saveTo(outFile, res);
    bufferList.push(surface.buff);
    this.renderer.flushBuffer();
  }

  // Wait for each frame to render.
  if (this.isGif) {
    // Actually write the gif.
    const self = this;
    this.createGif(width, height, bufferList, this.targetPath);
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

SaveImageDisplay.prototype.createGif = function(width, height, frames, outName) {
  const encoder = new GIFEncoder(width, height, 'octree', true, frames.length);

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

SaveImageDisplay.prototype.handleEvent = function(eventName, callback) {
  // pass
}

SaveImageDisplay.prototype._overlayGrid = function(surface, spacing) {
  let pitch = surface.pitch;
  let last = spacing - 1;
  for (let y = 0; y < surface.height; y++) {
    for (let x = 0; x < surface.width; x++) {
      if (((y % spacing) == last) || ((x % spacing) == last)) {
        let k = y*pitch + x*4;
        surface.buff[k+0] = this._blend(surface.buff[k+0], 0x00, 0xb0);
        surface.buff[k+1] = this._blend(surface.buff[k+1], 0xe0, 0xb0);
        surface.buff[k+2] = this._blend(surface.buff[k+2], 0x00, 0xb0);
      }
    }
  }
}

SaveImageDisplay.prototype._blend = function(mine, their, opacity) {
  let left = mine * (0x100 - opacity);
  let rite = their * opacity;
  return Math.floor((left + rite) / 0x100);
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
