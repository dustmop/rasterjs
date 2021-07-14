const displayWebGL = require('./display_webgl.js');
const display2dCanvas = require('./display_2d_canvas.js');
const plane = require('./plane.js');
const resources = require('./resources.js');
const rawBuffer = require('./raw_buffer.js');

function makeResources() {
  return new resources.Resources();
}

function makeDisplay() {
  if (detectFeatureWebGL()) {
    return new displayWebGL.Display();
  }
  return new display2dCanvas.Display();
}

function makeRawBuffer(res) {
  // TODO: raw_buffer constructor should accept resources
  return new rawBuffer.RawBuffer();
}

function getOptions() {
  return {};
}

function detectFeatureWebGL() {
  let canvas = document.createElement('canvas');
  let gl = canvas.getContext('webgl');
  if (gl) {
    return true;
  }
  return false;
}

module.exports.makeDisplay = makeDisplay;
module.exports.makeRawBuffer = makeRawBuffer;
module.exports.makeResources = makeResources;
module.exports.getOptions = getOptions;
