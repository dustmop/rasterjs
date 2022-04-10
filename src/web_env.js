const webGLDisplay = require('./webgl_display.js');
const twoDCanvas = require('./2d_canvas.js');
const plane = require('./plane.js');
const filesysWeb = require('./filesys_web.js');

function makeFilesysAccess() {
  return new filesysWeb.FilesysAccess();
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
module.exports.makeFilesysAccess = makeFilesysAccess;
module.exports.getOptions = getOptions;
