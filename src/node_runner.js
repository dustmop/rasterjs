const destructure = require('./destructure.js');
const rgbMapDefault = require('./rgb_map_default.js');
const algorithm = require('./algorithm.js');
const directMemory = require('./direct_memory.js');
const geometry = require('./geometry.js');
const image_loader = require('./image_loader.js');

////////////////////////////////////////

function Runner() {
  this.cmd = null;
  this.methods = null;
  this.then = null;
  this.renderer = null;
  this._config = {};
  return this;
}

Runner.prototype.initialize = function () {
  this._config.screenWidth = 100;
  this._config.screenHeight = 100;
  this._config.zoomScale = 1;
  this._config.translateX = 0;
  this._config.translateY = 0;
  this.initMem = new Array();
  const cppmodule = require('../build/Release/native');
  this.renderer = cppmodule();
  this.renderer.initialize();
  this.renderer.assignRgbMapping(rgbMapDefault.rgb_mapping);
}

Runner.prototype.resetState = function() {
  this.renderer.resetState();
}

Runner.prototype.setSize_params = ['w:i', 'h:i'];
Runner.prototype.setSize = function(w, h) {
  this._config.screenWidth = w;
  this._config.screenHeight = h;
  this.renderer.setSize(w, h);
}

Runner.prototype.setColor_params = ['color:i'];
Runner.prototype.setColor = function(color) {
  this._config.color = color;
  this.renderer.setColor(color);
}

Runner.prototype.setZoom_params = ['scale:i'];
Runner.prototype.setZoom = function(scale) {
  this._config.zoomScale = scale;
}

Runner.prototype.originAtCenter_params = [];
Runner.prototype.originAtCenter = function() {
  this._config.translateX = this._config.screenWidth / 2;
  this._config.translateY = this._config.screenHeight / 2;
}

Runner.prototype.fillBackground_params = ['color:i'];
Runner.prototype.fillBackground = function(color) {
  this._config.bgColor = color;
  this.renderer.fillBackground(color);
}

Runner.prototype._getTranslation = function() {
  return [this._config.translateX, this._config.translateY];
}

Runner.prototype.drawLine_params = ['x0:i', 'y0:i', 'x1:i', 'y1:i', 'cc?b'];
Runner.prototype.drawLine = function(x0, y0, x1, y1, cc) {
  cc = cc ? 1 : 0;
  let [tx, ty] = this._getTranslation();
  this.renderer.putLine(tx + x0, ty + y0, tx + x1, ty + y1, cc);
}

Runner.prototype.drawPoint_params = ['x:i', 'y:i'];
Runner.prototype.drawPoint = function(x, y) {
  let [tx, ty] = this._getTranslation();
  this.initMem.push([tx + x, ty + y, this._config.color]);
  this.renderer.putPoint(tx + x, ty + y);
}

Runner.prototype.fillSquare_params = ['x:i', 'y:i', 'size:i'];
Runner.prototype.fillSquare = function(x, y, size) {
  let [tx, ty] = this._getTranslation();
  this.renderer.putRect(tx + x, ty + y, size, size, true);
}

Runner.prototype.drawSquare_params = ['x:i', 'y:i', 'size:i'];
Runner.prototype.drawSquare = function(x, y, size) {
  let [tx, ty] = this._getTranslation();
  this.renderer.putRect(tx + x, ty + y, size, size, false);
}

Runner.prototype.fillRect_params = ['x:i', 'y:i', 'w:i', 'h:i'];
Runner.prototype.fillRect = function(x, y, w, h) {
  let [tx, ty] = this._getTranslation();
  this.renderer.putRect(tx + x, ty + y, w, h, true);
}

Runner.prototype.drawRect_params = ['x:i', 'y:i', 'w:i', 'h:i'];
Runner.prototype.drawRect = function(x, y, w, h) {
  let [tx, ty] = this._getTranslation();
  this.renderer.putRect(tx + x, ty + y, w, h, false);
}

Runner.prototype.fillCircle_params = ['x:i', 'y:i', 'r:i'];
Runner.prototype.fillCircle = function(x, y, r) {
  let [tx, ty] = this._getTranslation();
  let centerX = tx + x + r;
  let centerY = ty + y + r;
  let arc = algorithm.midpointCircleRasterize(r);
  this.renderer.putCircleFromArc(centerX, centerY, arc, null, true);
}

Runner.prototype.drawCircle_params = ['x:i', 'y:i', 'r:i', 'width?i'];
Runner.prototype.drawCircle = function(x, y, r, width) {
  let [tx, ty] = this._getTranslation();
  let centerX = tx + x + r;
  let centerY = ty + y + r;
  let arc = algorithm.midpointCircleRasterize(r);
  let inner = null;
  if (width) {
    inner = algorithm.midpointCircleRasterize(r - width - 1);
  }
  this.renderer.putCircleFromArc(centerX, centerY, arc, inner, false);
}

Runner.prototype.fillPolygon_params = ['points:ps', 'x?i', 'y?i'];
Runner.prototype.fillPolygon = function(points, x, y) {
  x = x || 0;
  y = y || 0;
  let [tx, ty] = this._getTranslation();
  this.renderer.putPolygon(tx + x, ty + y, points, true);
}

Runner.prototype.drawPolygon_params = ['points:ps', 'x?i', 'y?i'];
Runner.prototype.drawPolygon = function(points, x, y) {
  x = x || 0;
  y = y || 0;
  let [tx, ty] = this._getTranslation();
  this.renderer.putPolygon(tx + x, ty + y, points, false);
}

Runner.prototype.fillFrame_params = ['fillerFunc:f'];
Runner.prototype.fillFrame = function(fillerFunc) {
  var mem = directMemory.NewDirectMemory(this._config.screenWidth,
                                         this._config.screenHeight);
  // TODO: Move to another sourcefile?
  mem.fill(this._config.bgColor);
  // TODO: A hack to have drawPoint affect the initial mem state
  for (let i = 0; i < this.initMem.length; i++) {
    let row = this.initMem[i];
    let x = row[0];
    let y = row[1];
    mem[x + y*mem.pitch] = row[2];
  }
  if (fillerFunc.length == 1) {
    fillerFunc(mem);
  } else if (fillerFunc.length == 3) {
    for (let y = 0; y < mem.y_dim; y++) {
      for (let x = 0; x < mem.x_dim; x++) {
        let ret = fillerFunc(mem, x, y);
        if (ret !== null && ret !== undefined) {
          mem[x + y*mem.pitch] = ret;
        }
      }
    }
  } else {
    throw 'Invalid arguments for fillFrame: length = ' + fillerFunc.length;
  }
  this.renderer.putDirect(mem);
}

Runner.prototype.loadImage = function(filepath) {
  return image_loader.NewImage(filepath);
}

Runner.prototype.drawImage_params = ['img:a', 'x:i', 'y:i'];
Runner.prototype.drawImage = function(img, x, y) {
  image_loader.loadAll(this.renderer);
  let [tx, ty] = this._getTranslation();
  this.renderer.putImage(img, tx + x, ty + y);
}

Runner.prototype.doRender = function(num, renderFunc, postFunc) {
  this.renderer.createWindow(0, 0, this._config.zoomScale);
  this.renderer.appRenderAndLoop(function() {
    if (renderFunc) {
      renderFunc();
    }
    if (postFunc) {
      postFunc();
    }
  }, num);
}

Runner.prototype.doRenderFile = function(savepath) {
  this.renderer.saveTo(savepath);
}

////////////////////////////////////////

function Commander(owner) {
  this.owner = owner;
  return this;
}

Commander.prototype.push = function(row) {
  let fname = row[0];
  let fn = this.owner[fname]
  let param_spec = this.owner[fname + '_params'];
  if (fn === undefined) {
    console.log(`function ${fname} is not defined`);
    throw `function ${fname} is not defined`
  }
  if (param_spec === undefined) {
    console.log(`function ${fname} does not have parameter spec`);
    throw `function ${fname} does not have parameter spec`
  }
  let args = destructure(param_spec, row);
  fn.apply(this.owner, args);
}

////////////////////////////////////////

function MethodSet(owner) {
  this.owner = owner;
  return this;
}

MethodSet.prototype.resetState = function() {
  this.owner.resetState();
}

MethodSet.prototype.show = function() {
  this.owner.doRender(1, null, null);
}

MethodSet.prototype.run = function(renderFunc, postFunc) {
  this.owner.doRender(-1, renderFunc, postFunc);
}

MethodSet.prototype.save = function(savepath) {
  this.owner.doRenderFile(savepath);
}

MethodSet.prototype.fillFrame = function(fillerFunc) {
  this.owner.fillFrame(fillerFunc);
}

MethodSet.prototype.showFrame = function(fillerFunc) {
  this.owner.fillFrame(fillerFunc);
  this.owner.doRender(1, null, null);
}

MethodSet.prototype.makeShape = function(method, params) {
  if (method == 'rotate') {
    let [shape, angle] = params;
    geometry.rotatePolygon(shape, angle);
    return shape;
  } else if (method == 'load') {
    let [filepath] = params;
    return this.owner.loadImage(filepath);
  }
}

////////////////////////////////////////

function justDo(cb) {
  cb();
}

function start(callback) {
  let r = new Runner();
  r.cmd = new Commander(r);
  r.methods = new MethodSet(r);
  r.then = justDo;
  r.initialize();
  callback(r);
}

module.exports.start = start;
