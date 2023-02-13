const baseDisplay = require('./base_display.js');
const drawable = require('./drawable.js');
const destructure = require('./destructure.js');
const algorithm = require('./algorithm.js');
const palette = require('./palette.js');
const renderer = require('./renderer.js');
const executor = require('./executor.js');
const geometry = require('./geometry.js');
const imageLoader = require('./image_loader.js');
const textLoader = require('./text_loader.js');
const asciiDisplay = require('./ascii_display.js');
const plane = require('./plane.js');
const tiles = require('./tiles.js');
const sprites = require('./sprites.js');
const colorspace = require('./colorspace.js');
const interrupts = require('./interrupts.js');
const rgbColor = require('./rgb_color.js');
const types = require('./types.js');
const weak = require('./weak.js');
const verboseLogger = require('./verbose_logger.js');

////////////////////////////////////////

const FRAMES_LOOP_FOREVER = -1;

let verbose = new verboseLogger.Logger();

class Scene {
  constructor(env) {
    this._addMethods();
    this._env = env;
    this._fsacc = env.makeFilesysAccess();
    this._display = null;

    this._renderer = new renderer.Renderer();
    this.palette = null;

    this._owned = new plane.Plane();

    this.plane = this._owned;
    this._font = null;
    this.camera = {};
    this.tileset = null;
    this.colorspace = null;
    this.interrupts = null;
    this.spriteList = null;


    this._banks = null;
    this._layering = null;
    this._numFrames = FRAMES_LOOP_FOREVER;

    this._initialize();
    return this;
  }

  _initialize() {
    this._initConfig();
    this.time = 0.0;
    this.tick = 0;
    this.TAU = 6.283185307179586;
    this.TURN = this.TAU;
    this.PI = this.TAU / 2;
    this.camera = {};

    this._hasRenderedOnce = false;
    this._inspectScanline = null;
    this._inspectCallback = null;
    this._messageListeners = [];

    this.dip = {};
    this.dip.length = 0;

    this._renderer = new renderer.Renderer();
    this._executor = null;

    this._imgLoader = new imageLoader.Loader(this._fsacc, new weak.Ref(this));
    this._textLoader = new textLoader.TextLoader(this._fsacc);
    this._initPalette();

    let options = this._env.getOptions();
    this._numFrames = options.num_frames || FRAMES_LOOP_FOREVER;
    if (options.display) {
      this.useDisplay(options.display);
    } else {
      // default display
      this._display = this._env.makeDisplay();
    }
    this._display.initialize();
    if (options.colors) {
      this.useColors(options.colors);
    }
    if (options.zoom) {
      this.setZoom(options.zoom);
    }
    if (options.tick) {
      this._ensureExecutor();
      this._executor.advanceTick(options.tick);
    }
    Object.defineProperty(this, 'timeClick', {
      get() {
        throw new Error(`ra.timeClick is invalid, use ra.tick instead`);
      }
    });
    Object.defineProperty(this, 'timeTick', {
      get() {
        throw new Error(`ra.timeTick is invalid, use ra.tick instead`);
      }
    });
  }

  _initPalette() {
    this.palette = new palette.Palette();
    this.palette.giveFeatures(new weak.Ref(this));
    // TODO: possibly, this.palette.setDefaultRGBMap('quick');
    // then, don't have palette depend on rgb_map_quick
  }

  _addMethods() {
    let d = new drawable.Drawable();
    let methods = d.getMethods();
    for (let i = 0; i < methods.length; i++) {
      let [fname, paramSpec, converter, impl] = methods[i];
      let self = this;
      // Use a scoped function in order to acquire the method's `arguments`
      this[fname] = function() {
        self._validateOwnedPlane();
        let args = Array.from(arguments);
        if (paramSpec === undefined) {
          throw new Error(`function ${fname} does not have parameter spec`);
        }
        let realArgs = destructure.from(fname, paramSpec, args, converter);
        if (self.config.translateCenter) {
          self._translateArguments(paramSpec, realArgs);
        }
        self._owned[fname].apply(self.plane, realArgs);
      }
    }
    this.setColor = function(n) {
      this._validateOwnedPlane();
      this.palette.ensureRGBMap();
      this.plane.setColor(n);
    }
    this.fillColor = function(n) {
      this._validateOwnedPlane();
      this.palette.ensureRGBMap();
      this.plane.fillColor(n);
    }
  }

  _validateOwnedPlane() {
    if (this._owned == null) {
      let msg = `the scene does not own a plane, because ra.usePlane was called.\nModify the owned plane instead`;
      throw new Error(msg);
    }
  }

  _translateArguments(params, args) {
    let midX = this.plane.width / 2;
    let midY = this.plane.height / 2;
    for (let i = 0; i < params.length; i++) {
      let param = params[i];
      let arg = args[i];
      if (param.startsWith('x')) {
        if (args[i] === undefined) {
          args[i] = 0;
        }
        args[i] += midX;
      }
      if (param.startsWith('y')) {
        if (args[i] === undefined) {
          args[i] = 0;
        }
        args[i] += midY;
      }
    }
  }

  setTrueColor(rgb) {
    this._validateOwnedPlane();
    rgb = new rgbColor.RGBColor(rgb);
    this.palette.ensureRGBMap();
    let color = this.palette.addRGBMap(rgb);
    this.plane.setColor(color);
  }

  fillTrueColor(rgb) {
    this._validateOwnedPlane();
    rgb = new rgbColor.RGBColor(rgb);
    this.palette.ensureRGBMap();
    let color = this.palette.addRGBMap(rgb);
    this.plane.fillColor(color);
  }

  setSize(w, h, opt) {
    let spec = ['w:i', 'h?i', 'opt?any'];
    [w, h, opt] = destructure.from('setSize', spec, arguments, null);
    if (h === undefined) { h = w; };
    opt = opt || {};
    if (!opt.planeOnly) {
      this.width = w;
      this.height = h;
    }
    if (this.plane.width == 0 || this.plane.height == 0) {
      this.plane.setSize(w, h);
    }
    // TODO: allow resizing? Need to understand how display vs plane size
    // interact when one or the other is changed
    this._renderer.clear();
  }

  /**
   * Set the named component by switching to the N-th installed component
   */
  setComponent(compname, fromBank, opts) {
    /*
     * Example: ra.setComponent('camera', 1);
     *   assign this.camera to point at the 1-th bankable camera
     *   by default, this is the camera used by layer #1
     *
     * Example: ra.setComponent('tileset', 3, {layer: 0});
     *   assign this.tileset to point at the 3-th bankable tileset
     *   change layer 0's tileset to use that same component
     */
    if (fromBank != null && !types.isNumber(fromBank)) {
      throw new Error(`argument fromBank must be int, got ${fromBank}`);
    }

    // assign the component field from the i-ith bankable obj
    let assignComponent = null;
    if (compname == 'camera') {
      assignComponent = this._banks.camera[fromBank];
      this.camera = assignComponent;

    } else if (compname == 'tileset') {
      assignComponent = this._banks.tileset[fromBank];
      this.tileset = assignComponent;

    } else {
      throw new Error(`unknown component "${compname}"`);
    }

    // check for {layer: N} optional parameter
    let layerIndex = (opts || {}).layer;
    if (layerIndex == null) {
      return;
    }

    if (!this._layering) {
      this._layering = [
        this._addComponentsToLayer(this),
      ]
    }

    // if {layer: N} is given, modify the layer and the renderer
    let layer = this._layering[layerIndex];
    layer[compname] = assignComponent;
    this._renderer.switchComponent(layerIndex, compname, assignComponent);
  }

  setScrollX(x) {
    this.camera.x = Math.floor(x);
  }

  setScrollY(y) {
    this.camera.y = Math.floor(y);
  }

  resetState() {
    this.width = null;
    this.height = null;
    this._owned = new plane.Plane();
    this.plane = this._owned;
    this._banks = null;
    this._layering = null;
    this._renderer.clear();
    this._fsacc.clear();
    this._imgLoader.clear();
    if (this._executor) {
      this._executor.clear();
    }
    this.time = 0.0;
    this.tick = 0;
    this.camera = {};
    this.tileset = null;
    this.colorspace = null;
    this.interrupts = null;
    this.spriteList = null;
    this.rgbBuffer = null;
    this._initPalette();
    this._initConfig();
    this._addMethods();
  }

  _initConfig() {
    this.config = {
      zoomScale: 1,
      titleText: '',
      translateCenter: false,
      gridUnit: null,
    };
  }

  then(cb) {
    this._fsacc.whenLoaded(cb);
  }

  setZoom(scale) {
    this.config.zoomScale = scale;
  }

  setGrid(unit, opt) {
    let enable = !!unit;
    if (opt && opt.enable !== undefined) {
      enable = opt.enable;
    }
    this._display.setGrid(enable);
    if (this.config.gridUnit) {
      return;
    }
    if (!types.isNumber(unit)) {
      unit = 16;
    }
    this.config.gridUnit = unit;

    let width = this.width || this.plane.width;
    let height = this.height || this.plane.height;

    if (this._renderer) {
      // TODO: It is possible to get here with 0 width and 0 height if
      // setGrid is called before setSize / paste.
      this._renderer.changeGrid(this.config.zoomScale, width, height,
                                this.config.gridUnit);
    }
  }

  setTitle(title) {
    this.config.titleText = title;
  }

  originAtCenter() {
    this.config.translateCenter = true;
  }

  useDisplay(nameOrDisplay) {
    if (types.isString(nameOrDisplay)) {
      // name of a built-in string
      if (nameOrDisplay == 'ascii') {
        this._display = new asciiDisplay.AsciiDisplay();
      } else {
        this._display = this._env.makeDisplay(nameOrDisplay);
        if (!this._display) {
          throw new Error(`unknown built-in display name "${nameOrDisplay}"`);
        }
      }
    } else if (types.isDisplayObject(nameOrDisplay)) {
      // custom display object
      this._display = nameOrDisplay;
    } else if (types.isObject(nameOrDisplay)) {
      // NOTE: An experimental feature.
      let opt = nameOrDisplay;
      if (opt.displayElemID) {
        this._display.elemID = opt.displayElemID;
        return;
      }
      throw new Error(`illegal param for useDisplay: ${JSON.stringify(opt)}`);
    } else {
      throw new Error(`illegal param for useDisplay: ${JSON.stringify(nameOrDisplay)}`);
    }

    this._display.initialize();
  }

  // TODO: Re-organize the methods in this file, into topics.

  insertResource(name, imageSurf) {
    if (!types.isSurface(imageSurf)) {
      throw new Error(`insertResource: expects surface`);
    }
    this._imgLoader.insert(name, imageSurf);
  }

  // NOTE: An experimental feature.
  experimentalDisplayComponents(components, settings) {
    if (this._display.renderAndDisplayEachComponent) {
      this._display.renderAndDisplayEachComponent(components, settings);
    }
  }

  experimentalInspectScanline(scanline) {
    this._inspectScanline = scanline;
    if (this._renderer) {
      this._renderer.setInspector(this._inspectScanline, this._inspectCallback);
    }
  }

  loadImage(filepath, opt) {
    opt = opt || {};
    return this._imgLoader.loadImage(filepath, opt);
  }

  _makePolygon(pointsOrPolygon, center) {
    return geometry.convertToPolygon(pointsOrPolygon, center);
  }

  rotatePolygon(pointsOrPolygon, angle) {
    if (angle === null || angle === undefined) {
      angle = this.time;
    }
    let polygon = geometry.convertToPolygon(pointsOrPolygon);
    polygon.rotate(angle);
    return polygon;
  }

  select(x, y, w, h, name) {
    this._validateOwnedPlane();
    let spec = ['x:i', 'y:i', 'w:i', 'h:i', 'name?s'];
    [x, y, w, h, name] = destructure.from('select', spec, arguments, null);
    return this.plane.select(x, y, w, h, name);
  }

  xform(name) {
    this._validateOwnedPlane();
    return this.plane.xform(name);
  }

  fold(fname, paramList) {
    let params = {};
    for (let row of paramList) {
      params = Object.assign(params, row);
      this[fname].bind(this).call(this, params);
    }
  }

  _prepareRendering() {
    let plane = this.plane;

    if (!this.width || !this.height) {
      this._setDisplaySize();
    }
    this._renderer.connect(this.provide());

    if (this.colorspace && !this._hasRenderedOnce) {
      this.normalizePaletteColorspace();
      this._hasRenderedOnce = true;
    }

    this._renderer.setInspector(this._inspectScanline, this._inspectCallback);
  }

  _setDisplaySize() {
    let bottomTileset = null;
    let bottomPlane = null;

    if (this._layering) {
      // if layering is in use, get a reference to the bottom plane
      bottomPlane = this._layering[0].plane;

      // Also see if the bottom layer uses a tileset
      if (this._layering[0].tileset) {
        bottomTileset = this._banks.tileset[this._layering[0].tileset];
      }
    } else {
      bottomPlane = this.plane;
      bottomTileset = this.tileset;
    }


    if (!bottomTileset) {
      this.width = bottomPlane.width;
      this.height = bottomPlane.height;
    } else {
      this.width = bottomPlane.width * bottomTileset.tileWidth;
      this.height = bottomPlane.height * bottomTileset.tileHeight;
    }

    verbose.log(`display size set width=${this.width} height=${this.height}`, 5);
  }

  setNumFrames(num) {
    this._numFrames = num;
  }

  run(drawFunc, opt) {
    this._prepareRendering();

    let postRunFunc = (opt || {}).postRun || null;

    this._display.setSize(this.width, this.height);
    this._display.setRenderer(this._renderer);
    this._display.setZoom(this.config.zoomScale);

    this._ensureExecutor();
    this._executor.setLifetime(this._numFrames, postRunFunc);

    this.then(() => {
      try {
        this._executor.execApp(drawFunc);
      } catch (e) {
        this._env.handleErrorGracefully(e, this._display);
      }
    });
  }

  runFrame(param) {
    this._ensureExecutor();
    this._executor._forceRender = true;

    let tickDelta = 1;
    let afterFunc = null;
    if (types.isFunction(param)) {
      afterFunc = param;
    } else if (types.isObject(param)) {
      // TODO: use destructure
      tickDelta = param.delta;
      if (!types.isNumber(tickDelta)) {
        throw new Error(`runFrame({delta}) must be a number`);
      }
    }

    this._executor.advanceTick(tickDelta);
    if (types.isFunction(afterFunc)) {
      afterFunc();
    }
  }

  save(component, savepath) {
    let spec = ['component?component', 'savepath=s'];
    [component, savepath] = destructure.from(
      'save', spec, arguments, null);
    if (component) {
      // render component
      let res = component.visualize();
      this._fsacc.saveTo(savepath, res);
      return;
    }
    // render the main plane
    let res = this.renderPrimaryPlane();
    if (!this._fsacc) {
      throw new Error('cannot save plane without filesys access');
    }
    this._fsacc.saveTo(savepath, res);
  }

  renderPrimaryPlane() {
    this._prepareRendering();
    this._renderer.connect(this.provide());
    let res = this._renderer.render();
    if (res[0].width == 0 || res[0].height == 0 || res[0].pitch == 0) {
      throw new Error(`invalid scene: ${JSON.stringify(res)}`);
    }
    return res;
  }

  lockTimeToTick() {
    this._ensureExecutor();
    this._executor._lockTime = true;
  }

  quit() {
    if (!this._executor) {
      throw new Error(`app not running, cannot quit`);
    }
    this._executor.appQuit();
  }

  pause() {
    this._executor.setPauseState(!this._executor.isPaused);
  }

  mixColors(spec) {
    let result = [];
    let cursor = 0;
    let leftColor = spec[cursor + 1];
    let rightColor = spec[cursor + 3];
    let startIndex = spec[0];
    let targetIndex = spec[2];
    let endIndex = spec[spec.length - 2];
    for (let i = 0; i < endIndex; i++) {
      if (i == targetIndex) {
        cursor += 2;
        startIndex = targetIndex;
        leftColor = spec[cursor + 1];
        rightColor = spec[cursor + 3];
        targetIndex = spec[cursor + 2];
      }
      let L = new rgbColor.RGBColor(leftColor);
      let R = new rgbColor.RGBColor(rightColor);
      let rgb = L.interpolate(R, i, {min: startIndex, max: targetIndex});
      result.push(rgb.toInt());
    }
    return result;
  }

  oscil(namedOnly) {
    let spec = ['!name', 'period?i=60', 'begin?n', 'min?n=0.0', 'max?n=1.0', 'tick?a'];
    let [period, begin, min, max, tick] = destructure.from(
      'oscil', spec, arguments, null);

    let delta = max - min;
    period = period || 60;
    if (begin === undefined) {
      begin = 0.0;
    }
    if (tick === null) {
      tick = this.tick;
    }
    tick = tick + Math.round(period * begin);
    return delta * ((1.0 - Math.cos(tick * this.TAU / period)) / 2.0000001) + min;
  }

  setFont(spec, opt) {
    if (spec.startsWith('font:')) {
      let name = spec.split(':')[1];
      this._font = this._textLoader.createFontResource(name);
    } else {
      let filename = spec;
      this._font = this._textLoader.loadFont(filename, opt);
    }
    this.plane.font = this._font;
  }

  on(optPlane, eventName, callback) {
    let region = null;
    // TODO: destructure instead
    // ['plane?', 'string', 'function(1)']
    if (types.isPlane(optPlane)) {
      let pl = optPlane;
      region = {
        x: pl.offsetLeft, y: pl.offsetTop,
        w: pl.width, h: pl.height,
        name: pl.name,
      };
    } else {
      callback = eventName;
      eventName = optPlane;
    }

    let allowed = ['keypress', 'click', 'ready', 'render', 'message'];
    if (!allowed.includes(eventName)) {
      let expect = allowed.map((n)=>`"${n}"`).join(', ');
      throw new Error(`unknown event "${eventName}", only ${expect} supported`);
    }
    if (eventName == 'render') {
      this._inspectCallback = callback;
      if (this._renderer) {
        this._renderer.setInspector(this._inspectScanline, this._inspectCallback);
      }
      return;
    }
    if (eventName == 'message') {
      this._messageListeners.push(callback);
      return;
    }
    this._display.handleEvent(eventName, region, callback);
  }

  sendMessage(name, data) {
    for (let listener of this._messageListeners) {
      listener({name: name, data: data});
    }
  }

  resize(x, y) {
    this._validateOwnedPlane();
    return this.plane.resize(x, y);
  }

  eyedrop(x, y) {
    this._validateOwnedPlane();
    let c = this.plane.get(x, y);
    return this.palette.entry(c);
  }

  get(x, y) {
    this._validateOwnedPlane();
    return this.plane.get(x, y);
  }

  put(x, y, v) {
    this._validateOwnedPlane();
    return this.plane.put(x, y, v);
  }

  nge() {
    let spec = ['start:i', 'length?i'];
    let [start, length] = destructure.from('nge', spec, arguments, null);
    return Array.from(new Array(length), (x,i) => i+start)
  }

  useDips(names) {
    this._dipNames = names;
    let make = {};
    for (let n of names) {
      make[n] = true;
    }
    this.dip = make;
    this.dip.length = names.length;
    return this.dip;
  }

  dipNames() {
    return this._dipNames;
  }

  _newPaletteFromLookOfImage(look) {
    let size = look.max() + 1;
    let items = [];
    for (let i = 0; i < size; i++) {
      items.push(i);
    }
    // Assign the palette to the scene
    this.palette._entries = items;
    this.palette.giveFeatures(new weak.Ref(this));
    return this.palette;
  }

  _newPaletteEntries(vals, shouldSort, optSize) {
    this._paletteSetIdentityEntries(optSize);
    this.palette.giveFeatures(new weak.Ref(this));
    if (vals != null) {
      this.palette._entries = new Array(vals.length).fill(0);
      for (let i = 0; i < vals.length; i++) {
        this.palette._entries[i] = toNum(vals[i]);
      }
    }
    if (shouldSort) {
      let original = {};
      let rgbItems = [];
      for (let i = 0; i < this.palette._rgbmap.length; i++) {
        let rgbval = this.palette._rgbmap[i];
        original[rgbval] = i;
        rgbItems.push(new rgbColor.RGBColor(rgbval));
      }
      // Remove the first color, treat it as the background
      let bgColor = rgbItems[0];
      rgbItems = rgbItems.slice(1);
      // Sort by HSV
      rgbItems = algorithm.sortByHSV(rgbItems);
      // Put the background color in front
      rgbItems = [bgColor].concat(rgbItems);
      // Assign rgbmap
      let newmap = [];
      for (let k = 0; k < rgbItems.length; k++) {
        newmap.push(rgbItems[k].toInt());
      }
      this.palette._rgbmap = newmap;
      // Where did colors move to
      let recolor = {};
      for (let k = 0; k < rgbItems.length; k++) {
        let from = original[rgbItems[k].toInt()];
        recolor[from] = k;
      }
      // Assign the entries to the palette
      for (let i = 0; i < rgbItems.length; i++) {
        this.palette._entries[i] = i;
      }
      // Remap the colors in the data buffer
      let pl = this.plane;
      for (let y = 0; y < pl.height; y++) {
        for (let x = 0; x < pl.width; x++) {
          let k = pl.pitch * y + x;
          let c = pl.data[k];
          pl.data[k] = recolor[c];
        }
      }
    }
    return this.palette;
  }

  _paletteSetIdentityEntries(optSize) {
    if (!this.palette) {
      throw new Error(`palette cannot be null!`);
    }
    if (!this.palette._rgbmap) {
      throw new Error(`palette.rgbmap cannot be null!`);
    }
    if (!this.palette._entries) {
      let colors = this.palette._rgbmap;
      let size = optSize || colors.length;
      let items = [];
      for (let i = 0; i < size; i++) {
        items.push(i);
      }
      this.palette._entries = items;
    }
  }

  usePlane(pl) {
    if (types.isArray(pl)) {
      // pass
    } else {
      if (!types.isPlane(pl)) {
        throw new Error(`usePlane requires a Plane`);
      }
      pl = [pl];
    }
    // stop owning the plane
    this._owned = null;

    this.plane = pl[0];
    if (pl.length > 1) {
      // Create layering from the given planes
      if (this._layering != null) {
        throw new Error(`TODO: layering already exists`);
      }
      this._layering = new Array(pl.length);
      for (let i = 0; i < pl.length; i++) {
        this._layering[i] = {
          plane: pl[i],
        }
      }
      this._addComponentBanks('plane', pl);
    }
    this._ensureBankableCameras();

    return this.plane;
  }

  normalizePaletteColorspace() {
    if (!this.colorspace || !this.palette) {
      throw new Error(`need palette and colorspace`);
    }
    // don't ensure the plane is consistent if it is a pattern table
    // TODO: rewrite colorspace, it has many problems
    if (!this.tileset) {
      this.colorspace.ensureConsistentPlanePalette(this.plane, this.palette);
    }
  }

  usePalette(param, opt) {
    // can be called like this:
    //
    //   // name of a preset palette
    //   ra.usePalette('nes');
    //
    //   // rgbmap values
    //   ra.usePalette({rgbmap: [0xff8844, 0x6644cc, 0xffffff, 0x0066ff]});
    //
    //   // entries
    //   ra.usePalette({entries: [7, 4, 1, 0, 5, 6]});
    //
    //   // entries
    //   ra.usePalette({numEntries: 9});
    //
    //   // image look
    //   ra.usePalette(image.look);
    //
    this.palette.ensureRGBMap();

    if (!param) {
      // error
      throw new Error(`usePalette needs param, got null`);

    } else if (types.isString(param)) {
      // name of palette rgbmap
      this.palette.setRGBMap(palette.constructRGBMapFrom(param));
      return this.palette;

    } else if (types.isLookOfImage(param)) {
      // palette entries created from an image.look
      this.palette = this._newPaletteFromLookOfImage(param);
      if (opt && opt.upon) {
        this.palette = this._coverUponPalette(opt.upon, this.palette);
        // coverage implies agreement with me
        this._recolorPlaneToMatchPalette();
        return this.palette;
      }
      return this.palette;

    } else if (types.isObject(param)) {
      let agree = false;
      if (param.agree) {
        agree = true;
        delete param.agree;
      }
      this.palette = palette.buildFrom(param, {copy: this.palette});
      if (agree) {
        this._recolorPlaneToMatchPalette();
      }
      return this.palette;
    }

    throw new Error(`usePalette: unsupported param ${param}`);
  }

  _recolorPlaneToMatchPalette() {
    // TODO: verbose.log here
    this.palette.agreeWithMe(this.plane);
  }

  _coverUponPalette(coverageLook, palette) {
    if (!types.isLookOfImage(coverageLook)) {
      throw new Error(`LookOfImage required, got ${coverageLook}`);
    }
    palette.agreeWithThem(coverageLook);
    palette._rgbmap = this.palette._rgbmap;
    return palette;
  }

  useLayering(configLayers) {
    for (let i = 0; i < configLayers.length; i++) {
      let cfgrow = configLayers[i];
      //let spec = ['layer:i', 'plane:i', 'palette?i', 'tileset?i',
      //            'colorspace?i'];
      //let out = destructure.from('useLayering', spec, cfgrow, null);
      //console.log(`${i} : ${JSON.stringify(cfgrow)} => ${out}`);
      //let [layer, plane, palette, tileset, colorspace] = out;
      let layer = cfgrow.layer;
      let plane = cfgrow.plane;
      let tileset = cfgrow.tileset || null;
      let palette = cfgrow.palette || null;
      let colorspace = cfgrow.colorspace || null;
      if (layer != i) {
        throw new Error(`layer must be equal to ${i}, got ${layer}`);
      }
      assertInRange(plane, 0, configLayers.length);
      if (palette) {
        // TODO: ensure exactly 1 palette has a unique rgbmap
        assertInRange(palette, 0, configLayers.length);
      }
      if (tileset) {
        assertInRange(tileset, 0, configLayers.length);
      }
      if (colorspace) {
        assertInRange(colorspace, 0, configLayers.length);
      }
    }
    this._layering = new Array(configLayers.length);
    if (!this._banks) {
      this._banks = {};
    }
    // TODO: validate banks accesses, it's an error for a layer to
    // use an index larger than what the component banks contain
    for (let i = 0; i < configLayers.length; i++) {
      let build = {};
      let layer = configLayers[i];
      if (configLayers[i].plane != null) {
        let index = configLayers[i].plane;
        build.plane = this._banks.plane[index];
      }
      if (configLayers[i].palette != null) {
        let index = configLayers[i].palette;
        build.palette = this._banks.palette[index];
      }
      if (configLayers[i].tileset != null) {
        let index = configLayers[i].tileset;
        build.tileset = this._banks.tileset[index];
      }
      this._layering[i] = build;
    }
    this._ensureBankableCameras();
  }

  _addComponentBanks(name, componentList) {
    if (!this._banks) {
      this._banks = {}
    }
    if (this._banks[name]) {
      throw new Error(`banks already exist for component "${name}"`);
    }
    this._banks[name] = new Array(componentList.length);
    for (let i = 0; i < componentList.length; i++) {
      this._banks[name][i] = componentList[i];
    }
  }

  _ensureBankableCameras() {
    if (!this._layering) {
      return;
    }
    let numCameras = this._layering.length;
    if (!this._banks.camera) {
      this._banks.camera = new Array(numCameras);
      for (let i = 0; i < numCameras; i++) {
        this._banks.camera[i] = {x:0, y:0};
      }
    }
    for (let i = 0; i < numCameras; i++) {
      let layer = this._layering[i];
      if (!layer.camera) {
        layer.camera = this._banks.camera[i];
      }
    }
  }

  useTileset(something, sizeInfo) {
    if (!something) {
      throw new Error(`useTileset expects an argument`);
    }
    if (types.isArray(something)) {
      if (something.length < 1) {
        throw new Error(`useTileset expects at least 1 tileset`);
      }
      let outExtra = {};
      let collect = [];
      for (let param of something) {
        collect.push(tiles.createFrom(param, sizeInfo, this.plane, outExtra));
      }
      this.tileset = collect[0];
      this._addComponentBanks('tileset', collect);
    } else {
      let outExtra = {};
      let t = tiles.createFrom(something, sizeInfo, this.plane, outExtra);
      this.tileset = t;
      if (outExtra.pattern && outExtra.fromCurrentPlane) {
        // When buliding a tileset from the current plane, replace that
        // plane with the generated pattern table.
        this.plane = outExtra.pattern;
      }
    }
    if (this.colorspace) {
      this.colorspace.ensureConsistentTileset(this.tileset, this.palette);
    }
    return this.tileset;
  }

  useColorspace(pl, sizeInfo) {
    if (!this.palette) {
      // TODO: Colorspace without a palette just slices up colorMap
      throw new Error('cannot useColorpsace without a palette');
    }
    // TODO: validate sizeInfo
    this.colorspace = new colorspace.Colorspace(pl, this.palette, sizeInfo);
    if (this.tileset) {
      this.colorspace.ensureConsistentTileset(this.tileset, this.palette);
    }
    return this.colorspace;
  }

  useInterrupts(conf) {
    if (types.isArray(conf)) {
      this.interrupts = new interrupts.Interrupts(conf, new weak.Ref(this));
    } else if (types.isInterrupts(conf)) {
      this.interrupts = conf;
    } else {
      throw new Error(`useInterrupts param must be array or interrupts`);
    }
    return this.interrupts;
  }

  provide() {
    // TODO: test directly, see what is provided for various (multilayer) setups
    let provision = [];
    if (this._layering == null) {
      provision.push(this._addComponentsToLayer(this));
    } else {
      for (let i = 0; i < this._layering.length; i++) {
        let res = this._addComponentsToLayer(this._layering[i]);
        provision.push(res);
      }
    }

    provision.world = {};
    provision.world.interrupts = this.interrupts;
    provision.world.spriteList = this.spriteList;
    provision.world.palette = this.palette;

    if (this.config.gridUnit) {
      provision.world.grid = {
        zoom: this.config.zoomScale,
        width: this.width,
        height: this.height,
        unit: this.config.gridUnit,
      };
    }
    return provision;
  }

  _addComponentsToLayer(components) {
    let res = {};
    if (components.plane) {
      res.plane = components.plane;
    }
    if (components.camera) {
      res.camera = components.camera;
    }
    if (components.tileset) {
      res.tileset = components.tileset;
    }
    if (components.palette) {
      res.palette = components.palette;
    }
    if (components.colorspace) {
      res.colorspace = components.colorspace;
    }
    res.size = this._calculatePixelSize(res);
    res.size.width = this.width;
    res.size.height = this.height;
    return res;
  }

  _calculatePixelSize(res) {
    let width = res.plane.width;
    let height = res.plane.height;
    if (res.tileset) {
      width *= res.tileset.tileWidth;
      height *= res.tileset.tileHeight;
    }
    if (width > this.width) {
      width = this.width;
    }
    if (height > this.height) {
      height = this.height;
    }
    return {width: width, height: height};
  }

  _saveSurfacesTo(surfaces, filename) {
    this._fsacc.saveTo(filename, surfaces);
  }

  useSpriteList(sprites) {
    // TODO: handle multiple different arguments
    this.spriteList = sprites;
    return this.spriteList;
  }

  _ensureExecutor() {
    if (this._executor) { return; }
    this._executor = new executor.Executor(this._display, new weak.Ref(this));
  }
}


Scene.prototype.Plane = function() {
  if (new.target === undefined) {
    throw new Error('Plane constructor must be called with `new`');
  }
  let p = new plane.Plane();
  p._addMethods(true);
  return p;
}

Scene.prototype.Polygon = function(pointsOrPolygon, center) {
  if (new.target === undefined) {
    throw new Error('Polygon constructor must be called with `new`');
  }
  return geometry.convertToPolygon(pointsOrPolygon, center);
}

Scene.prototype.Tileset = function() {
  if (new.target === undefined) {
    throw new Error('Tileset constructor must be called with `new`');
  }
  let args = arguments;
  return new tiles.Tileset(args[0]);
}

Scene.prototype.Tile = function() {
  if (new.target === undefined) {
    throw new Error('Tile constructor must be called with `new`');
  }
  let args = arguments;
  return new tiles.Tile(args[0], args[1]);
}

Scene.prototype.SpriteList = function() {
  if (new.target === undefined) {
    throw new Error('SpriteList constructor must be called with `new`');
  }
  let args = arguments;
  return new sprites.SpriteList(args[0], args[1]);
}

Scene.prototype.SpriteSheet = function() {
  if (new.target === undefined) {
    throw new Error('SpriteSheet constructor must be called with `new`');
  }
  let args = arguments;
  return new sprites.SpriteSheet(args[0], args[1]);
}

Scene.prototype.RGBColor = function(_many) {
  if (new.target === undefined) {
    throw new Error('RGBColor constructor must be called with `new`');
  }
  let args = arguments;
  return new rgbColor.RGBColor(args[0], args[1], args[2]);
}

Scene.prototype.Display = baseDisplay.BaseDisplay;


function toNum(n) {
  if (n == null) {
    return 0;
  } else if (types.isNumber(n)) {
    return n;
  } else if (types.isRGBColor(n)) {
    return n.toInt();
  }
  throw new Error(`toNum: unknown type of ${n}`);
}


function assertInRange(value, min, maxExclusive) {
  if (value >= min && value < maxExclusive) {
    return;
  }
  throw new Error(`invalid value ${JSON.stringify(value)}, must be >= ${min} and < ${maxExclusive}`);
}


module.exports.Scene = Scene;
