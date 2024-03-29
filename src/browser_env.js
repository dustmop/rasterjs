const webGLDisplay = require('./webgl_display.js');
const twoDCanvas = require('./2d_canvas.js');
const field = require('./field.js');
const filesysWeb = require('./filesys_web.js');

class BrowserEnv {
  makeFilesysAccess() {
    return new filesysWeb.FilesysAccess();
  }

  displays() {
    if (!runningUnderKarma() && detectFeatureWebGL()) {
      return {'webgl': ()=>{
        return new webGLDisplay.WebGLDisplay();
      }};
    }
    return {'2d': ()=>{
      return new twoDCanvas.TwoDeeDisplay();
    }};
  }

  getOptions() {
    return {};
  }

  handleErrorGracefully(err, display) {
    if (display.onErrorHandler) {
      display.onErrorHandler(err);
      return;
    }
    console.log(err);
  }
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

function make() {
  return new BrowserEnv();
}

module.exports.make = make;
