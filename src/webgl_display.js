const compile = require('./compile.js');

function Display() {
  this.elemID = null;
  this.canvas = null;
  this.eventKeypressHandler = null;
  this.eventClickHandler = null;
  this.initialize();
  this._createEventHandlers();
  return this;
}

Display.prototype.initialize = function() {
  this.elemID = null;
  this.imgAssets = [];
  this.displayWidth = 0;
  this.displayHeight = 0;
  this.zoomLevel = 1;
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

Display.prototype.setGrid = function(state) {
  this.gridState = state;
  let gl = this.gl;
  if (gl) {
    let program = this.program;
    var gridEnableLocation = gl.getUniformLocation(program, "u_gridEnable");
    gl.uniform1i(gridEnableLocation, this.gridState);
  }
}

Display.prototype._createWebglCanvas = function() {
  let displayID = 'main-display';
  if (this.elemID) {
    displayID = this.elemID;
  }

  var canvasElem = document.getElementById(displayID);
  if (canvasElem != null) {
    let tag = canvasElem.tagName;
    if (tag !== 'CANVAS') {
      throw new Error(`display html elem must be a canvas, got ${tag}`);
    }
    this.canvas = canvasElem;
  } else {
    var canvasContainer = document.getElementById('canvas');
    if (canvasContainer) {
      this.canvas = document.createElement('canvas');
      this.canvas.id = displayID;
      canvasContainer.appendChild(this.canvas);
    } else {
      this.canvas = document.createElement('canvas');
      this.canvas.id = displayID;
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
  style.textContent = '#' + displayID + ' { ' +
    'width: ' + elemWidth + 'px; ' +
    'height: ' + elemHeight + 'px; border: solid 1px black;}';
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
uniform sampler2D u_imageGrid;
uniform bool u_gridEnable;

varying vec2 v_texcoord;

void main() {
   vec4 left = texture2D(u_image0, v_texcoord);

   if (!u_gridEnable) {
      gl_FragColor = left;
   } else {
      vec4 rite = texture2D(u_imageGrid, v_texcoord);
      vec3 combined = mix(left.rgb, rite.rgb, rite.a);
      gl_FragColor = vec4(combined, left.a);
   }
}
`;

  var program = compile.createProgram(gl, vertexShaderText, fragmentShaderText);
  this.program = program;

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
    // Create texture for the front buffer
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
    // Create texture for the grid
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
  var imageGridLocation = gl.getUniformLocation(program, "u_imageGrid");
  gl.uniform1i(image0Location, 0); // texture unit 0
  gl.uniform1i(imageGridLocation, 1); // texture for grid

  var gridEnableLocation = gl.getUniformLocation(program, "u_gridEnable");
  gl.uniform1i(gridEnableLocation, 1);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, textureList[0]);
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, textureList[1]);

  // draw the quad (2 triangles, 6 vertices)
  gl.drawArrays(gl.TRIANGLES, 0, 6);
}

Display.prototype._createEventHandlers = function() {
  let self = this;
  document.addEventListener('keypress', function(e) {
    if (self.eventKeypressHandler) {
      self.eventKeypressHandler({
        key: e.key
      });
    }
  })
  document.addEventListener('click', function(e) {
    if (self.eventClickHandler) {
      let x = Math.floor(e.offsetX / self.zoomLevel);
      let y = Math.floor(e.offsetY / self.zoomLevel);
      if (x >= 0 && x < self.displayWidth && y >= 0 && y < self.displayHeight) {
        self.eventClickHandler({x: x, y: y});
      }
    }
  })
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
  let gridLayer = null;
  let self = this;
  let gridHaveCopied = false;

  let renderIt = function() {
    // Did the app quit?
    if (self.currentRunId != id) {
      return;
    }

    // Get the data buffer from the plane.
    let res = self.renderer.render();
    frontBuffer = res[0].buff;
    gridLayer = res[1];

    // Render front buffer to the display
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
    }

    // Render grid, only needs to be done once
    if (gridLayer && !gridHaveCopied) {
      gridHaveCopied = true;
      gl.activeTexture(gl.TEXTURE1);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0,
                       gridLayer.width, gridLayer.height,
                       gl.RGBA, gl.UNSIGNED_BYTE, gridLayer.buff);
    }

    if (frontBuffer) {
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

Display.prototype.handleEvent = function(eventName, callback) {
  if (eventName == 'keypress') {
    this.eventKeypressHandler = callback;
  } else if (eventName == 'click') {
    this.eventClickHandler = callback;
  } else {
    throw new Error(`unknown event "${eventName}"`);
  }
}

module.exports.Display = Display;
