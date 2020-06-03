
const createSdlWrapper = require('../build/Release/native');

function Raster() {
  this.initFunc = null;
  this.frameFunc = null;
  return this;
}

function arrayEquals(left, rite) {
  if (left.length !== rite.length) {
    return false;
  }
  for (let i = 0; i < left.length; i++) {
    if (left[i] !== rite[i]) {
      return false;
    }
  }
  return true;
}

Raster.prototype.run = function(app) {
  let keys = Object.keys(app);
  keys = keys.sort();
  if (!arrayEquals(keys, ["frame", "init"])) {
    console.log("App's key must be exactly 'init', 'frame'");
    throw 'Run failed';
  }

  this.initFunc = app.init;
  this.frameFunc = app.frame;

  this.config = {};

  let ctorHandle = this.constructInitHandle();
  this.initFunc(ctorHandle);
  this.renderLoop();
}

Raster.prototype.constructInitHandle = function() {
  let self = this;
  return {
    setViewportSize: function(w, h) {
      self.config.screenWidth = w;
      self.config.screenHeight = h;
    },
    setPixelScale: function(s) {
      self.config.scale = s;
    }
  };
}

Raster.prototype.constructRunHandle = function() {
  let self = this;
  return {
    drawSquare: function(args) {
      // TODO: Draw
    }
  };
}

Raster.prototype.renderLoop = function() {
  let runHandle = this.constructRunHandle();

  var sdlWrapper = createSdlWrapper(10);
  sdlWrapper.sdlInit();
  sdlWrapper.createWindow();

  // Event loop
  this.frameFunc(runHandle);

  sdlWrapper.renderLoop();
}

var _priv_raster = new Raster();

module.exports.run = function(param) {
  _priv_raster.run(param);
};
