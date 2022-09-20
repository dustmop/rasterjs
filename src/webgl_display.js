const baseDisplay = require('./base_display.js');
const compile = require('./compile.js');

const SHARPEN = 2;

class WebGLDisplay extends baseDisplay.BaseDisplay {
  constructor() {
    super();
    this.elemID = null;
    this.canvas = null;
    this.eventKeypressHandler = null;
    this.eventClickHandler = null;
    this.initialize();
    this.onReadyHandler = null;
    this._createEventHandlers();
  }

  initialize() {
    this.elemID = null;
    this.imgAssets = [];
    this._width = 0;
    this._height = 0;
    this._zoomLevel = 1;
    this.gridState = false;
    this.currentRunId = null;
  }

  setRenderer(renderer) {
    this._renderer = renderer;
    this._hasDocumentBody = false;
    let self = this;
    window.addEventListener('DOMContentLoaded', function() {
      self._hasDocumentBody = true;
    });
    if (document.readyState == 'complete' || document.readyState == 'loaded') {
      self._hasDocumentBody = true;
    }
  }

  setGrid(state) {
    this.gridState = state;
    let gl = this.gl;
    if (gl) {
      let program = this.program;
      var gridEnableLocation = gl.getUniformLocation(program, "u_gridEnable");
      gl.uniform1i(gridEnableLocation, this.gridState);
    }
  }

  setCallbacks(num, exitAfter, finalFunc) {
    this._numFrames = num;
    this._exitAfter = exitAfter;
    this._finalFunc = finalFunc;
  }

  _createWebglCanvas() {
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

    var elemWidth = this._width * this._zoomLevel;
    var elemHeight = this._height * this._zoomLevel;

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
uniform sampler2D u_image1;

uniform sampler2D u_imageGrid;
uniform bool u_gridEnable;

varying vec2 v_texcoord;

void main() {
   vec4 layer0 = texture2D(u_image0, v_texcoord);
   vec4 layer1 = texture2D(u_image1, v_texcoord);
   layer0 = vec4(mix(layer0.rgb, layer1.rgb, layer1.a), 1.0);

   if (u_gridEnable) {
      vec4 layerGrid = texture2D(u_imageGrid, v_texcoord);
      layer0 = vec4(mix(layer0.rgb, layerGrid.rgb, layerGrid.a), 1.0);
   }
   gl_FragColor = layer0;
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

    let bufs = {
      positionBuffer: positionBuffer,
      positionLocation: positionLocation,
      texcoordBuffer: texcoordBuffer,
      texcoordLocation: texcoordLocation,
    };

    let texWidth = this._width;
    let texHeight = this._height;
    var textureList = [];
    for (let i = 0; i < 2; i++) {
      textureList.push(this._makeTexture(gl, texWidth, texHeight, bufs));
    }
    texWidth = this._width * this._zoomLevel;
    texHeight = this._height * this._zoomLevel;
    let gridTexture = this._makeTexture(gl, texWidth, texHeight, bufs);

    var image0Location = gl.getUniformLocation(program, "u_image0");
    var image1Location = gl.getUniformLocation(program, "u_image1");
    var imageGridLocation = gl.getUniformLocation(program, "u_imageGrid");
    gl.uniform1i(image0Location, 0); // texture unit 0
    gl.uniform1i(image1Location, 1); // texture unit 1
    gl.uniform1i(imageGridLocation, 7); // texture for grid

    var gridEnableLocation = gl.getUniformLocation(program, "u_gridEnable");
    gl.uniform1i(gridEnableLocation, this.gridState);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, textureList[0]);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, textureList[1]);
    gl.activeTexture(gl.TEXTURE7);
    gl.bindTexture(gl.TEXTURE_2D, gridTexture);

    // draw the quad (2 triangles, 6 vertices)
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  _makeTexture(gl, width, height, bufs) {
    // Create texture for the front buffer
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA,
                  width, height,
                  0, gl.RGBA, gl.UNSIGNED_BYTE, null);

    // let's assume all images are not a power of 2
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    // Setup the attributes to pull data from our buffers
    gl.bindBuffer(gl.ARRAY_BUFFER, bufs.positionBuffer);
    gl.enableVertexAttribArray(bufs.positionLocation);
    gl.vertexAttribPointer(bufs.positionLocation, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, bufs.texcoordBuffer);
    gl.enableVertexAttribArray(bufs.texcoordLocation);
    gl.vertexAttribPointer(bufs.texcoordLocation, 2, gl.FLOAT, false, 0, 0);
    return texture;
  }

  renderAndDisplayEachComponent(components, settings) {
    this._renderAndDisplayComponents = components;
    this._renderAndDisplaySettings = settings;

    let self = this;
    window.addEventListener('DOMContentLoaded', function(e) {
      let possible = ['plane', 'colorMap', 'palette', 'tileset',
                      'attributes', 'interrupts'];
      for (let i = 0; i < possible.length; i++) {
        let p = possible[i];
        if (components.indexOf(p) > -1) {
          self.enableDisplayElem(`${p}-display`);
        }
      }
    });
  }

  _createEventHandlers() {
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
        if (x >= 0 && x < self._width && y >= 0 && y < self._height) {
          self.eventClickHandler({x: x, y: y});
        }
      }
    })
  }

  waitForContentLoad(cb) {
    let self = this;
    setTimeout(function() {
      if (!self._hasDocumentBody) {
        self.waitForContentLoad(cb);
        return;
      }
      cb();
    }, 0);
  }

  renderLoop(id, nextFrame) {
    let self = this;
    self.currentRunId = id;
    this.waitForContentLoad(function() {
      self._createWebglCanvas();
      if (self.onReadyHandler) {
        self.onReadyHandler();
      }
      self._beginLoop(nextFrame, id, self._numFrames, self._exitAfter, self._finalFunc);
    });
  }

  appQuit() {
    this.currentRunId = null;
  }

  _beginLoop(nextFrame, id, num, exitAfter, finalFunc) {
    let gl = this.gl;
    let frontBuffer = null;
    let topBuffer = null;
    let gridLayer = null;
    let self = this;
    let gridHaveCopied = false;

    let comps = self._renderAndDisplayComponents;
    let settings = self._renderAndDisplaySettings;
    self._renderer.onRenderComponents(comps, settings, function(type, surface) {
      if (Array.isArray(surface)) {
        surface = surface[0];
      }
      if (type == 'palette') {
        self._putSurfaceToElem(surface, 'palette-display');
      } else if (type == 'colorMap') {
        self._putSurfaceToElem(surface, 'colorMap-display');
      } else if (type == 'plane') {
        self._putSurfaceToElem(surface, 'plane-display');
      } else if (type == 'tileset') {
        self._putSurfaceToElem(surface, 'tileset-display');
      } else if (type == 'attributes') {
        self._putSurfaceToElem(surface, 'attributes-display');
      } else if (type == 'interrupts') {
        self._putSurfaceToElem(surface, 'interrupts-display');
      } else {
        throw new Error(`unknown display type ${type}`);
      }
    });

    let renderIt = function() {
      // Did the app quit?
      if (self.currentRunId != id) {
        return;
      }

      // Get the data buffer from the plane.
      let res = self._renderer.render();
      frontBuffer = res[0].buff;
      topBuffer = res[1] && res[1].buff;
      gridLayer = res.grid;

      // Render front buffer to the display
      if (frontBuffer) {
        gl.activeTexture(gl.TEXTURE0);

        let numPoints = self._width * self._height;
        let numBytes = numPoints*4;
        if (numBytes != frontBuffer.length) {
          let msg = 'invalid buffer size for display: ';
          msg += `${numBytes} != ${frontBuffer.length}`;
          throw new Error(msg);
        }

        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0,
                         self._width, self._height,
                         gl.RGBA, gl.UNSIGNED_BYTE, frontBuffer);
      }

      if (topBuffer) {
        gl.activeTexture(gl.TEXTURE1);

        let numPoints = self._width * self._height;
        let numBytes = numPoints*4;
        if (numBytes != topBuffer.length) {
          let msg = 'invalid buffer size for display: ';
          throw new Error(msg);
        }

        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0,
                         self._width, self._height,
                         gl.RGBA, gl.UNSIGNED_BYTE, topBuffer);
      }

      // Render grid, only needs to be done once
      if (gridLayer && !gridHaveCopied) {
        gridHaveCopied = true;
        gl.activeTexture(gl.TEXTURE7);
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

      if (self._renderAndDisplayComponents) {

        // Hack to run the first IRQ, at scanline 0
        if (self._renderer.interrupts) {
          let first = self._renderer.interrupts.arr[0];
          if (first.scanline == 0) {
            first.irq(0);
          }
        }
      }

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

  handleEvent(eventName, callback) {
    if (eventName == 'keypress') {
      this.eventKeypressHandler = callback;
    } else if (eventName == 'click') {
      this.eventClickHandler = callback;
    } else if (eventName == 'ready') {
      this.onReadyHandler = callback;
    } else {
      throw new Error(`unknown event "${eventName}"`);
    }
  }

  _putSurfaceToElem(surface, elemID) {
    let canvasElem = document.getElementById(elemID);
    if (!canvasElem) {
      canvasElem = document.createElement('canvas');
      canvasElem.id = elemID;
      document.body.appendChild(canvasElem);
    }
    if (!surface) {
      canvasElem.style.display = 'none';
      return;
    }
    if (canvasElem.tagName.toLowerCase() != 'canvas') {
      let child = canvasElem.querySelector('canvas');
      if (!child) {
        child = document.createElement('canvas');
        canvasElem.appendChild(child);
      }
      canvasElem = child;
    }
    canvasElem.width = surface.width;
    canvasElem.height = surface.height;

    let buffer = surface.buff;
    let array = new Uint8ClampedArray(buffer.buffer, 0, buffer.byteLength);
    let imageData = new ImageData(array, surface.width, surface.height);
    let ctx = canvasElem.getContext('2d');
    ctx.putImageData(imageData, 0, 0);
  }

  enableDisplayElem(elemID) {
    let canvasElem = document.getElementById(elemID);
    if (canvasElem) {
      canvasElem.style.display = 'block';
    }
  }
};

module.exports.WebGLDisplay = WebGLDisplay;
