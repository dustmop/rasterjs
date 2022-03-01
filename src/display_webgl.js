const compile = require('./compile.js');

function Display() {
  this.canvas = null;
  this.initialize();
  return this;
}

Display.prototype.initialize = function() {
  this.imgAssets = [];
  this.displayWidth = 0;
  this.displayHeight = 0;
  this.zoomLevel = 1;
  this.gridUnit = 0;
  this.currentRunId = null;
}

const SHARPEN = 2;

Display.prototype.setSize = function(width, height) {
  this.displayWidth = width;
  this.displayHeight = height;
}

Display.prototype.setRenderer = function(renderer) {
  this.renderer = renderer;
  this._hasDocumentBody = false;
  let self = this;
  window.addEventListener('DOMContentLoaded', function() {
    self._hasDocumentBody = true;
  });
  if (document.readyState == 'complete' || document.readyState == 'loaded') {
    self._hasDocumentBody = true;
  }
}

Display.prototype.setZoom = function(zoomLevel) {
  this.zoomLevel = zoomLevel;
}

Display.prototype.setGrid = function(unit) {
  this.gridUnit = unit;
}

Display.prototype._createWebglCanvas = function() {
  var canvasElems = document.getElementsByTagName('canvas');
  if (canvasElems.length >= 1) {
    this.canvas = canvasElems[0];
  } else {
    var canvasContainer = document.getElementById('canvas');
    if (canvasContainer) {
      this.canvas = document.createElement('canvas');
      canvasContainer.appendChild(this.canvas);
    } else {
      this.canvas = document.createElement('canvas');
      document.body.appendChild(this.canvas);
    }
  }

  var gl = this.canvas.getContext("webgl");
  if (!gl) {
    return;
  }

  var elemWidth = this.displayWidth * this.zoomLevel;
  var elemHeight = this.displayHeight * this.zoomLevel;

  // Canvas's coordinate system.
  this.canvas.width = elemWidth * SHARPEN;
  this.canvas.height = elemHeight * SHARPEN;

  // Size that element takes up in rendered page.
  var style = document.createElement('style');
  style.textContent = 'canvas { width: ' + elemWidth + 'px; height: ' +
      elemHeight + 'px; border: solid 1px black;}';
  document.body.appendChild(style);

  var vertexShaderText = `
attribute vec4 a_position;
attribute vec2 a_texcoord;
varying vec2 v_texcoord;
void main() {
   gl_Position = a_position;
   v_texcoord = a_texcoord;
}
`;

  var fragmentShaderText = `
precision mediump float;

uniform sampler2D u_image0;
uniform sampler2D u_image1;

varying vec2 v_texcoord;

void main() {
   vec4 left = texture2D(u_image0, v_texcoord);
   vec4 rite = texture2D(u_image1, v_texcoord);
   vec3 combined = mix(left.rgb, rite.rgb, rite.a);
   gl_FragColor = vec4(combined, left.a);
}
`;

  var program = compile.createProgram(gl, vertexShaderText, fragmentShaderText);

  // look up where the vertex data needs to go.
  var positionLocation = gl.getAttribLocation(program, "a_position");
  var texcoordLocation = gl.getAttribLocation(program, "a_texcoord");

  // Create a buffer.
  var positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

  // Put a unit quad in the buffer
  var positions = [
   -1, 1,
    1, 1,
    1,-1,
   -1, 1,
    1,-1,
   -1,-1,
  ];
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

  // Create a buffer for texture coords
  var texcoordBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);

  // Put texcoords in the buffer
  var texcoords = [
    0, 0,
    1, 0,
    1, 1,
    0, 0,
    1, 1,
    0, 1,
  ];
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texcoords), gl.STATIC_DRAW);
  this.gl = gl;

  // Tell WebGL to use our shader program pair
  gl.useProgram(program);

  gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  gl.clear(gl.COLOR_BUFFER_BIT);

  var textureList = [];

  {
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA,
                  this.displayWidth, this.displayHeight,
                  0, gl.RGBA, gl.UNSIGNED_BYTE, null);

    // let's assume all images are not a power of 2
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    // Setup the attributes to pull data from our buffers
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
    gl.enableVertexAttribArray(texcoordLocation);
    gl.vertexAttribPointer(texcoordLocation, 2, gl.FLOAT, false, 0, 0);
    textureList.push(texture);
  }

  {
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA,
                  this.displayWidth*this.zoomLevel,
                  this.displayHeight*this.zoomLevel,
                  0, gl.RGBA, gl.UNSIGNED_BYTE, null);

    // let's assume all images are not a power of 2
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    textureList.push(texture);
  }

  var image0Location = gl.getUniformLocation(program, "u_image0");
  var image1Location = gl.getUniformLocation(program, "u_image1");
  gl.uniform1i(image0Location, 0); // texture unit 0
  gl.uniform1i(image1Location, 1); // texture unit 1

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, textureList[0]);
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, textureList[1]);

  // draw the quad (2 triangles, 6 vertices)
  gl.drawArrays(gl.TRIANGLES, 0, 6);

  if (this.gridUnit) {
    let gridWidth = this.displayWidth * this.zoomLevel;
    let gridHeight = this.displayHeight * this.zoomLevel;
    let gridBuff = this._createGrid(this.gridUnit);
    gl.activeTexture(gl.TEXTURE1);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0,
                     gridWidth, gridHeight,
                     gl.RGBA, gl.UNSIGNED_BYTE, gridBuff);
  }
}

Display.prototype._createGrid = function(unit) {
  let width = this.displayWidth * this.zoomLevel;
  let height = this.displayHeight * this.zoomLevel;
  let targetPoint = unit * this.zoomLevel;
  let lastPoint = targetPoint - 1;
  let numPoints = width*height;
  let buff = new Uint8Array(numPoints*4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let k = (y*width + x)*4;
      if (((y % targetPoint) == lastPoint) || (x % targetPoint) == lastPoint) {
        buff[k+0] = 0x00;
        buff[k+1] = 0xe0;
        buff[k+2] = 0x00;
        buff[k+3] = 0xb0;
      } else {
        buff[k+0] = 0x00;
        buff[k+1] = 0x00;
        buff[k+2] = 0x00;
        buff[k+3] = 0x00;
      }
    }
  }
  return buff;
}

Display.prototype.waitForContentLoad = function(cb) {
  let self = this;
  setTimeout(function() {
    if (!self._hasDocumentBody) {
      self.waitForContentLoad(cb);
      return;
    }
    cb();
  }, 0);
}

Display.prototype.renderLoop = function(nextFrame, id, num, exitAfter, finalFunc) {
  let self = this;
  self.currentRunId = id;
  this.waitForContentLoad(function() {
    self._createWebglCanvas();
    self._beginLoop(nextFrame, id, num, exitAfter, finalFunc);
  });
}

Display.prototype.appQuit = function() {
  this.currentRunId = null;
}

Display.prototype._beginLoop = function(nextFrame, id, num, exitAfter, finalFunc) {
  let gl = this.gl;
  let frontBuffer = null;
  let self = this;

  let renderIt = function() {
    // Did the app quit?
    if (self.currentRunId != id) {
      return;
    }

    // Get the data buffer from the plane.
    let res = self.renderer.render();
    frontBuffer = res[0].buff;

    // Render to the display
    if (frontBuffer) {
      gl.activeTexture(gl.TEXTURE0);

      let numPoints = self.displayWidth * self.displayHeight;
      let numBytes = numPoints*4;
      if (numBytes != frontBuffer.length) {
        let msg = 'invalid buffer size for display: ';
        msg += `${numBytes} != ${frontBuffer.length}`;
        throw new Error(msg);
      }

      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0,
                       self.displayWidth, self.displayHeight,
                       gl.RGBA, gl.UNSIGNED_BYTE, frontBuffer);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
      if (num > 0) {
        num--;
      }
    }

    // Create the next frame.
    nextFrame();

    if (num == 0) {
      if (finalFunc) {
        finalFunc();
      }
      return;
    }

    // Wait for next frame.
    requestAnimationFrame(renderIt);
  };

  renderIt();
}

module.exports.Display = Display;
