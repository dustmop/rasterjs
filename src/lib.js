
const createSdlWrapper = require('../build/Release/native');

function Raster() {
  this.initFunc = null;
  this.frameFunc = null;
  this.sdlWrapper = null;
  this.timeClick = null;
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

function isObject(thing) {
  if (thing === null) {
    return false;
  }
  return (typeof thing === 'object' && !Array.isArray(thing));
}

function destructure(first_param, args, fields) {
  let caller = destructure.caller;
  if (args.length != 1 || !isObject(first_param)) {
    // Normal list of unnamed parameters passed to the function.
    if (args.length != fields.length) {
      throw 'destructure: function "' + caller.name + '" expected ' + fields.length + ' arguments, got ' + args.length;
    }
    return args;
  }
  // Object containing named parameters passed to the function.
  let result = [];
  let haveKeys = Object.keys(first_param);
  for (let i = 0; i < fields.length; i++) {
    let f = fields[i];
    let pos = haveKeys.indexOf(f);
    if (pos == -1) {
      throw 'destructure: function "' + caller.name + '" needs parameter "' + f + '"';
    }
    haveKeys.splice(pos, 1);
    result.push(first_param[f]);
  }
  // Validate there's no unknown parameters passed to the function.
  if (haveKeys.length == 1) {
    let f = haveKeys[0];
    throw 'destructure: function "' + caller.name + '" unknown parameter "' + f + '"';
  } else if (haveKeys.length > 1) {
    throw 'destructure: function "' + caller.name + '" unknown parameters "' + haveKeys + '"';
  }
  return result;
}

function rotatePolygon(polygon, angle) {
  var axis = centerOf(polygon);

  for (var i = 0; i < polygon.length; i++) {
    var x = polygon[i][0];
    var y = polygon[i][1];
    x = x - axis[0];
    y = y - axis[1];

    var rot_x = x * Math.cos(angle) - y * Math.sin(angle);
    var rot_y = x * Math.sin(angle) + y * Math.cos(angle);

    polygon[i][0] = rot_x + axis[0];
    polygon[i][1] = rot_y + axis[1];
  }
}

function centerOf(polygon) {
  var left  = polygon[0][0];
  var top   = polygon[0][1];
  var right = polygon[0][0];
  var bot   = polygon[0][1];
  for (var i = 1; i < polygon.length; i++) {
    var p = polygon[i];
    if (p[0] < left) {
      left = p[0];
    }
    if (p[0] > right) {
      right = p[0];
    }
    if (p[1] < top) {
      top = p[1];
    }
    if (p[1] > bot) {
      bot = p[1];
    }
  }
  return [(left+right)/2, (top+bot)/2];
}

Raster.prototype.run = function(app) {
  let keys = Object.keys(app);
  keys = keys.sort();
  if (!arrayEquals(keys, ['frame', 'init'])) {
    console.log("App's key must be exactly 'init', 'frame'");
    throw 'Run failed';
  }

  this.initFunc = app.init;
  this.frameFunc = app.frame;

  this.config = {};
  this.timeClick = 0;

  let ctorHandle = this.constructInitHandle();
  this.initFunc(ctorHandle);
  this.config.translateX = 0;
  this.config.translateY = 0;
  if (this.config.translateCenter) {
    this.config.translateX = this.config.screenWidth / 2;
    this.config.translateY = this.config.screenHeight / 2;
  }
  this.renderLoop();
}

Raster.prototype.constructInitHandle = function() {
  let self = this;
  return {
    setViewportSize: function(params) {
      let [w, h] = destructure(params, arguments, ['w', 'h']);
      self.config.screenWidth = w;
      self.config.screenHeight = h;
    },
    setPixelScale: function(s) {
      self.config.scale = s;
    },
    originAtCenter: function() {
      self.config.translateCenter = true;
    },
  };
}

let TAU = 6.283185307179586;

Raster.prototype.constructRenderHandle = function() {
  let self = this;
  let handle = {
    TAU: TAU,
    timeClick: 0,
    oscillate: function(period, click) {
      if (click === undefined) {
        click = handle.timeClick;
      }
      return (1.0 - Math.cos(click * TAU / period)) / 2.0;
    },
    fillBackground: function(color) {
      self.sdlWrapper.fillBackground(color);
    },
    setColor: function(color) {
      self.sdlWrapper.setColor(color);
    },
    drawSquare: function(params) {
      let [x, y, size] = destructure(params, arguments, ['x', 'y', 'size']);
      x += self.config.translateX;
      y += self.config.translateY;
      self.sdlWrapper.drawRect(x, y, size, size);
    },
    drawRect: function(params) {
      let [x, y, w, h] = destructure(params, arguments, ['x', 'y', 'w', 'h']);
      x += self.config.translateX;
      y += self.config.translateY;
      self.sdlWrapper.drawRect(x, y, w, h);
    },
    drawPolygon: function(params) {
      self.sdlWrapper.drawPolygon(self.config.translateX,
                                  self.config.translateY, params);
    },
    drawLine: function(params) {
      let [x, y, x1, y1] = destructure(params, arguments, ['x','y','x1','y1']);
      x  += self.config.translateX;
      y  += self.config.translateY;
      x1 += self.config.translateX;
      y1 += self.config.translateY;
      self.sdlWrapper.drawLine(x, y, x1, y1);
    },
    rotatePolygon: rotatePolygon,
  };
  return handle;
}

Raster.prototype.renderLoop = function() {
  let config = this.config;
  this.renderHandle = this.constructRenderHandle();
  this.sdlWrapper = createSdlWrapper();
  this.sdlWrapper.sdlInit();
  this.sdlWrapper.createWindow(config.screenWidth, config.screenHeight);
  let self = this;
  this.sdlWrapper.renderLoop(function() {
    self.renderOnce();
  });
}

Raster.prototype.renderOnce = function() {
  // Called once per render operation. Set the click, then call app's frame
  this.renderHandle.timeClick = this.timeClick;
  this.timeClick++;
  this.frameFunc(this.renderHandle);
}

var _priv_raster = new Raster();

module.exports.run = function(param) {
  _priv_raster.run(param);
};
