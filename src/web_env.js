const webGLDisplay = require('./webgl_display.js');
const twoDCanvas = require('./2d_canvas.js');
const plane = require('./plane.js');
const resources = require('./resources.js');

function makeResources() {
  return new resources.Resources();
}

function makeDisplay() {
  if (!runningUnderKarma() && detectFeatureWebGL()) {
    return new webGLDisplay.Display();
  }
  return new twoDCanvas.Display();
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

function runningUnderKarma() {
  return window.__karma__ !== undefined;
}

module.exports.makeDisplay = makeDisplay;
module.exports.makeResources = makeResources;
module.exports.getOptions = getOptions;
