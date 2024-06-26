const baseDisplay = require('./base_display.js');
const glCompile = require('./gl_compile.js');

const SHARPEN = 2;

class WebGLDisplay extends baseDisplay.BaseDisplay {
  constructor() {
    super();
    this.elemID = null;
    this.canvas = null;
    this.initialize();
    this._eventManager = null;
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

  name() {
    return 'webgl';
  }

  isRealTime() {
    return true;
  }

  setRenderer(renderer) {
    this._renderer = renderer;
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

    var program = glCompile.createProgram(gl, vertexShaderText,
                                          fragmentShaderText);
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

    window.addEventListener('DOMContentLoaded', (e) => {
      let possible = ['field', 'palette', 'tileset',
                      'colorspace', 'interrupts'];
      for (let i = 0; i < possible.length; i++) {
        let p = possible[i];
        if (components.indexOf(p) > -1) {
          this.enableDisplayElem(`${p}-display`);
        }
      }
    });
  }

  forwardNativeEvents(eventManager) {
    this._eventManager = eventManager;
  }

  _createEventHandlers() {
    if (typeof document == 'undefined') { return; }
    document.addEventListener('keyup', (e) => {
      if (this._eventManager) { this._handleWebEvent('keyup', e); }
    });
    document.addEventListener('keydown', (e) => {
      if (this._eventManager) { this._handleWebEvent('keydown', e); }
    });
    document.addEventListener('keypress', (e) => {
      if (this._eventManager) { this._handleWebEvent('keypress', e); }
    });
    document.addEventListener('click', (e) => {
      if (this._eventManager) { this._handleWebEvent('click', e); }
    });
  }

  _handleWebEvent(name, webEvent) {
    if (name == 'click') {
      return this._processClickEvent(webEvent);
    }
    let e = {code: webEvent.keyCode};
    let keycode = this._eventManager.lookupCodeFromWebKey(webEvent.key);
    if (keycode) {
      e.code = keycode;
    }
    this._eventManager.getNativeKey(name, e);
  }

  _processClickEvent(e) {
    let displayID = 'main-display';
    if (this.elemID) {
      displayID = this.elemID;
    }
    if (e.target && e.target.id != displayID) {
      return;
    }
    let basex = Math.floor(e.offsetX / this._zoomLevel);
    let basey = Math.floor(e.offsetY / this._zoomLevel);
    let event = {
      basex: basex,
      basey: basey,
      width: this._width,
      height: this._height,
    };
    this._eventManager.getNativeClick(event);
  }

  waitForContentLoad(cb) {
    setTimeout(() => {
      if (!this._hasDocumentBody) {
        this.waitForContentLoad(cb);
        return;
      }
      cb();
    }, 0);
  }

  appLoop(id, execNextFrame) {
    this._hasDocumentBody = false;
    window.addEventListener('DOMContentLoaded', () => {
      this._hasDocumentBody = true;
    });
    let readyState = document.readyState;
    if (readyState == 'interactive' || readyState == 'complete') {
      this._hasDocumentBody = true;
    }
    this.currentRunId = id;
    this.waitForContentLoad(() => {
      this._createWebglCanvas();
      if (this._eventManager) { this._eventManager.getEvent('ready'); }
      this._beginLoop(id, execNextFrame);
    });
  }

  _beginLoop(id, execNextFrame) {
    let _gridHaveCopied = false;

    let comps = this._renderAndDisplayComponents;
    let settings = this._renderAndDisplaySettings;
    this._renderer.onRenderComponents(comps, settings, (type, surface) => {
      if (Array.isArray(surface)) {
        surface = surface[0];
      }
      if (type == 'palette') {
        this._putSurfaceToElem(surface, 'palette-display');
      } else if (type == 'palette-rgbmap') {
        // NOTE: this enables the element
        let id = 'palette-rgbmap-display';
        let displayElem = document.getElementById(id);
        displayElem.style.display = 'inline';
        this._putSurfaceToElem(surface, id);
      } else if (type == 'field') {
        this._putSurfaceToElem(surface, 'field-display');
      } else if (type == 'tileset') {
        this._putSurfaceToElem(surface, 'tileset-display');
      } else if (type == 'colorspace') {
        this._putSurfaceToElem(surface, 'colorspace-display');
      } else if (type == 'interrupts') {
        this._putSurfaceToElem(surface, 'interrupts-display');
      } else {
        throw new Error(`unknown component type ${type}`);
      }
    });

    let surfaceList;

    let renderIt = () => {
      // Did the app quit?
      if (!this.isRunning()) {
        return;
      }

      // calling run() a second time stops the first loop
      // useful for interactive web environments
      if (this.currentRunId != id) {
        return;
      }

      // Create the next frame.
      let hasFrame = execNextFrame();
      if (hasFrame) {
        // Get the RGB data buffers from the field.
        surfaceList = this._renderer.render();
      }
      if (surfaceList) {
        this.drawSurfacesToWebgl(surfaceList);
      }

      if (this._renderAndDisplayComponents) {

        // Hack to run the first IRQ, at scanline 0
        if (this._renderer.interrupts) {
          let first = this._renderer.interrupts.arr[0];
          if (first.scanline == 0) {
            first.irq(0);
          }
        }
      }

      // Wait for next frame.
      requestAnimationFrame(renderIt);
      return;
    };

    renderIt();
  }

  drawSurfacesToWebgl(surfaceList) {
    let gl = this.gl;
    let frontBuffer = surfaceList[0].buff;
    let topBuffer = surfaceList[1]?.buff;
    let gridLayer = surfaceList.grid;

    // Render front buffer to the display
    if (frontBuffer) {
      gl.activeTexture(gl.TEXTURE0);

      let numPoints = this._width * this._height;
      let numBytes = numPoints*4;
      if (numBytes != frontBuffer.length) {
        let msg = 'invalid buffer size for display: ';
        msg += `${numBytes} != ${frontBuffer.length}`;
        throw new Error(msg);
      }

      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0,
                       this._width, this._height,
                       gl.RGBA, gl.UNSIGNED_BYTE, frontBuffer);
    }

    if (topBuffer) {
      gl.activeTexture(gl.TEXTURE1);

      let numPoints = this._width * this._height;
      let numBytes = numPoints*4;
      if (numBytes != topBuffer.length) {
        let msg = 'invalid buffer size for display: ';
        throw new Error(msg);
      }

      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0,
                       this._width, this._height,
                       gl.RGBA, gl.UNSIGNED_BYTE, topBuffer);
    }

    // Render grid, only needs to be done once
    if (gridLayer && !this._gridHaveCopied) {
      this._gridHaveCopied = true;
      gl.activeTexture(gl.TEXTURE7);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0,
                       gridLayer.width, gridLayer.height,
                       gl.RGBA, gl.UNSIGNED_BYTE, gridLayer.buff);
    }

    if (frontBuffer) {
      gl.drawArrays(gl.TRIANGLES, 0, 6);
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
