const compile = require('./compile.js');

function Display() {
  this.canvas = null;
  return this;
}

Display.prototype.initialize = function() {
  this.imgSet = [];
  this.numToLoad = 0;
  this.numLoadDone = 0;
}

const SHARPEN = 2;

Display.prototype.createWindow = function(plane, zoomLevel) {
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

  var elemWidth = plane.width * zoomLevel;
  var elemHeight = plane.height * zoomLevel;

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
varying vec2 v_texcoord;
uniform sampler2D u_texture;
void main() {
   gl_FragColor = texture2D(u_texture, v_texcoord);
}
`;

  var program = compile.createProgram(gl, vertexShaderText, fragmentShaderText);

  // look up where the vertex data needs to go.
  var positionLocation = gl.getAttribLocation(program, "a_position");
  var texcoordLocation = gl.getAttribLocation(program, "a_texcoord");

  // lookup uniforms
  var textureLocation = gl.getUniformLocation(program, "u_texture");

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

  // Hold onto the plane.
  this.plane = plane;
  this.gl = gl;

  var texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, plane.width, plane.height,
                0, gl.RGBA, gl.UNSIGNED_BYTE, plane.buffer);

  // let's assume all images are not a power of 2
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

  gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  gl.clear(gl.COLOR_BUFFER_BIT);

  // First update
  gl.bindTexture(gl.TEXTURE_2D, texture);

  // Tell WebGL to use our shader program pair
  gl.useProgram(program);

  // Setup the attributes to pull data from our buffers
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.enableVertexAttribArray(positionLocation);
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
  gl.enableVertexAttribArray(texcoordLocation);
  gl.vertexAttribPointer(texcoordLocation, 2, gl.FLOAT, false, 0, 0);

  // draw the quad (2 triangles, 6 vertices)
  gl.drawArrays(gl.TRIANGLES, 0, 6);
}

Display.prototype.readImage = function(filepath) {
  let img = new Image;
  this.numToLoad++;
  img.onload = function() {
    this.numLoadDone++;
  }
  img.src = "/" + filepath;
  return null;
}

Display.prototype.appRenderAndLoop = function(nextFrame) {
  let self = this;
  let pl = this.plane;
  let gl = this.gl;
  let frontBuffer = null;

  let renderIt = function() {
    // Render to the display
    if (frontBuffer) {
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, pl.width, pl.height, gl.RGBA,
                       gl.UNSIGNED_BYTE, frontBuffer);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    // Create the next frame.
    nextFrame();

    // Allocate buffer once available
    if (!frontBuffer && pl.buffer) {
      frontBuffer = new Uint8Array(pl.buffer.byteLength);
    }
    // Copy to next buffer.
    if (frontBuffer) {
      for (let k = 0; k < pl.buffer.byteLength; k++) {
        frontBuffer[k] = pl.buffer[k];
      }
    }

    // Wait for next frame.
    requestAnimationFrame(renderIt);
  };
  this.waitForImageLoads(function() {
    requestAnimationFrame(renderIt);
  });
}

Display.prototype.waitForImageLoads = function(cb) {
  let self = this;
  setTimeout(function() {
    if (self.numToLoad > self.numLoadDone) {
      self.waitForImageLoads(cb);
      return;
    }
    cb();
  }, 0);
}

module.exports.Display = Display;
