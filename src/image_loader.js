const rgbColor = require('./rgb_color.js');
const algorithm = require('./algorithm.js');
const palette = require('./palette.js');
const types = require('./types.js');
const verboseLogger = require('./verbose_logger.js');

let verbose = new verboseLogger.Logger();

const LOAD_STATE_NONE = 0;
const LOAD_STATE_OPENED = 1;
const LOAD_STATE_READ = 2;
const LOAD_STATE_FILLED = 3;
const LOAD_STATE_ERROR = -1;

class Loader {
  constructor(fsacc, scene) {
    if (!scene) {
      throw new Error('needs non-null scene object')
    }
    this.list = [];
    this.addedFiles = {};
    this.fsacc = fsacc;
    this.scene = scene;
    return this;
  }

  loadImage(filename, opt) {
    let sortUsingHSV = false;
    if (opt.sortColors) {
      if (opt.sortColors == 'usingHSV') {
        sortUsingHSV = true;
      } else {
        throw new Error(`unknown sortColors key "${opt.sortColors}"`);
      }
    } else if (Object.keys(opt) > 0) {
      throw new Error(`unknown option value ${opt}`);
    }

    if (this.addedFiles[filename]) {
      let found = this.addedFiles[filename];
      let planePitch = found.width;
      let imgPlane = new ImagePlane();
      imgPlane.top = found.top || 0;
      imgPlane.left = found.left || 0;
      imgPlane.rgbBuff = found.buff;
      imgPlane.width = found.width;
      imgPlane.pitch = planePitch;
      imgPlane.height = found.height;
      imgPlane.colorMap = this.scene.colorMap;
      imgPlane.loadState = LOAD_STATE_READ;
      imgPlane.fillData();
      return imgPlane;
    }

    if (!filename.endsWith('.png')) {
      throw new Error(`only 'png' images supported, couldn't load ${filename}`);
    }

    let self = this;

    let img = new ImagePlane();
    img.parentLoader = this;
    img.filename = filename;
    img.id = this.list.length;
    img.colorMap = this.scene.colorMap;
    img.palette = this.scene.palette;
    img.sortUsingHSV = sortUsingHSV;
    img.left = 0;
    img.top = 0;
    img.loadState = LOAD_STATE_NONE;
    // resources.openImage assigns these:
    img.width = 0;
    img.height = 0;
    img.pitch = 0;
    img.data = null;

    // TODO: -1 not found sync, 0 success, 1 async
    let ret = this.fsacc.readImageData(filename, img);
    if (ret == -1) {
      throw new Error('image not found');
    }

    // HACK: openImage should return a uint8array, not ArrayBuffer
    // web_env returns a Uint8Array (but also img.data == null currently)
    // node_env returns an ArrayBuffer
    if (img.rgbBuff) {
      if (img.rgbBuff.constructor.name == 'Buffer') {
        // pass
      } else if (img.rgbBuff.constructor.name == 'ArrayBuffer') {
        img.rgbBuff = new Uint8Array(img.rgbBuff);
      } else if (img.rgbBuff.constructor.name == 'Uint8Array') {
        // pass
      } else if (img.rgbBuff.constructor.name == 'Uint8ClampedArray') {
        // pass
      } else {
        throw `error, unknown type for rgbBuff: ${img.rgbBuff.constructor.name}`;
      }
      img.fillData();
    } else {
      img.loadState = LOAD_STATE_OPENED; // async
    }

    this.list.push(img);
    return img;
  }

  insert(name, imageSurf) {
    if (!types.isSurface(imageSurf)) {
      throw new Error(`insert: expects surface`);
    }
    this.addedFiles[name] = imageSurf;
  }
}

class LookAtImage {
  constructor(items, density) {
    if (!density) {
      throw new Error(`LookAtImage needs density parameter`);
    }
    // Clone the list of items
    this._items = items.slice();
    this._density = density;
    this.length = items.length;
    this._min = Math.min(...items);
    this._max = Math.max(...items);
    return this;
  }

  toInts() {
    return this._items;
  }

  min() {
    return this._min;
  }

  max() {
    return this._max;
  }

  density() {
    return this._density;
  }
}

class ImagePlane {
  constructor() {
    this.parentLoader = null;
    this.filename = null;
    this.id = null;
    this.slice = null;
    this.width = 0;
    this.height = 0;
    this.data = null;
    this.alpha = null;
    this.rgbBuff = null;
    this.colorMap = null;
    this.palette = null;
    this.sortUsingHSV = false;
    return this;
  }

  whenRead() {
    this.loadState = LOAD_STATE_READ;
    let collect = this.parentLoader;
    for (let img of collect.list) {
      if (img.loadState == LOAD_STATE_ERROR) {
        continue;
      } else if (img.loadState == LOAD_STATE_NONE || img.loadState == LOAD_STATE_OPENED) {
        return;
      } else if (img.loadState == LOAD_STATE_READ) {
        img.fillData();
      }
    }
  }

  ensureReady() {
    this.fillData();
  }

  select(x, y, w, h) {
    let make = new ImagePlane();
    make.parentLoader = this.parentLoader;
    make.filename = this.filename;
    make.id = this.id;
    make.left = x;
    make.top = y;
    make.width = w;
    make.height = h;
    make.pitch = this.pitch;
    make.data = this.data;
    make.alpha = this.alpha;
    make.rgbBuff = this.rgbBuff;
    make.colorMap = this.colorMap;
    make.palette = this.palette;
    make.sortUsingHSV = this.sortUsingHSV;
    return make;
  }

  clone() {
    let make = new ImagePlane();
    make.parentLoader = this.parentLoader;
    make.filename = this.filename;
    make.id = this.id;
    make.left = 0;
    make.top = 0;
    make.width = this.width;
    make.height = this.height;
    make.pitch = this.pitch;
    make.colorMap = this.colorMap;
    make.palette = this.palette;
    make.sortUsingHSV = this.sortUsingHSV;
    // Deep copy `make.data`, NOTE: no alpha nor rgbBuff
    make.data = new Uint8Array(this.data.length);
    for (let k = 0; k < this.data.length; k++) {
      make.data[k] = this.data[k];
    }

    return make;
  }

  replace(other) {
    if (this.data.length != other.data.length) {
      throw new Error('IMPLEMENT ME: replace with different data length');
    }
    for (let k = 0; k < other.data.length; k++) {
      this.data[k] = other.data[k];
    }
  }

  get(x, y) {
    // TODO: offsets `left` and `top`
    x = Math.floor(x);
    y = Math.floor(y);
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return null;
    }
    let k = y * this.pitch + x;
    return this.data[k];
  }

  put(x, y, v) {
    // TODO: offsets `left` and `top`
    x = Math.floor(x);
    y = Math.floor(y);
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return;
    }
    let k = y * this.pitch + x;
    this.data[k] = Math.floor(v);
  }

  fillData() {
    this.loadState = LOAD_STATE_FILLED;
    if (this.data == null) {
      let numPixels = this.height * this.width;
      this.data = new Uint8Array(numPixels);
      this.alpha = new Uint8Array(numPixels);
    }
    let needs = this._collectColorNeeds();

    let numColors = needs.rgbItems.length
    if (numColors > 0xff) {
      throw new Error(`too many colors in image ${this.filename}: ${numColors}`);
    }

    // Sort the colors, if required.
    if (this.sortUsingHSV) {
      needs.rgbItems = algorithm.sortByHSV(needs.rgbItems);
    }

    // Create mapping from rgb to 8-bit value
    let remap = {};
    let collect = [];
    for (let i = 0; i < needs.rgbItems.length; i++) {
      let rgbval = needs.rgbItems[i].toInt();
      let c;
      if (this.palette) {
        let cval = this.colorMap.find(rgbval);
        if (cval == -1) {
          c = this.palette.insertWhereAvail(rgbval);
          if (c == null) {
            throw new Error(`palette exists, and image ${this.filename} uses a color not found in the colorMap: ${needs.rgbItems[i]}`);
          }
        } else {
          c = this.palette.find(cval);
          if (c == null) {
            throw new Error(`image uses valid colors, but palette is full. color=0x${rgbval.toString(16)}`);
          }
        }
      } else {
        c = this.colorMap.extendWith(rgbval);
      }
      remap[rgbval] = c;
      collect.push(c);
    }

    verbose.log(`loading image with rgb map: ${JSON.stringify(remap)}`, 6);

    // Look of the image, see the used color values
    this.look = new LookAtImage(collect, needs.density);
    //
    // # Why is this a LookAtImage object?
    //
    // This object represents the colors used by the loaded image,
    // sorted according to where they are seen in the image (upper
    // left first). It has two use cases:
    //
    // 1) Used as input for palette.cycle, treating the image as colors
    // 2) To construct a palette object which will get cycled,
    // by constructing a palette large enough to hold all used values.
    //
    // This second use case implies that this value can't be a plain
    // array, but needs to be some sort tof object.
    //
    // # Why do it this way instead of calling this a palette?
    //
    // If this is a palette, do we want to have that list of colors
    // be sparse? Should the image have its colors compacted down
    // to start at 0? Is there a use-case for using palette aside
    // from assigning them to the scene?
    //
    // What happens if we grab img.palette and modify it with setColor?
    //
    // Should img.get(x,y) work the same before and after being drawn?
    //
    // # Maybe a use case with attributes?
    //
    // I think the look can help to assign sprites their correct
    // attribute. Need to research how this would actually work.

    // Build the data buffer
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        let k = y * this.pitch + x;
        this.alpha[k] = this.rgbBuff[k*4+3];
        if (this.alpha[k] < 0x80) {
          continue;
        }
        let r = this.rgbBuff[k*4+0];
        let g = this.rgbBuff[k*4+1];
        let b = this.rgbBuff[k*4+2];
        let rgbval = r * 0x10000 + g * 0x100 + b;
        let c = remap[rgbval];
        this.data[k] = c;
      }
    }

    this._numColors = numColors;
  }

  _collectColorNeeds() {
    let lookup = {};
    let rgbItems = [];
    let minColorsPerLine = 9999;
    let maxColorsPerLine = 0;
    for (let y = 0; y < this.height; y++) {
      let seen = {};
      for (let x = 0; x < this.width; x++) {
        let k = y * this.pitch + x;
        this.alpha[k] = this.rgbBuff[k*4+3];
        // Transparent pixels are not added to the colorMap.
        if (this.alpha[k] < 0x80) {
          continue;
        }
        let r = this.rgbBuff[k*4+0];
        let g = this.rgbBuff[k*4+1];
        let b = this.rgbBuff[k*4+2];
        let rgbval = r * 0x10000 + g * 0x100 + b;
        seen[rgbval] = (seen[rgbval] || 0) + 1;
        if (lookup[rgbval] !== undefined) {
          continue;
        }
        // New rgb color found, add it
        lookup[rgbval] = rgbItems.length;
        rgbItems.push(new rgbColor.RGBColor(rgbval));
      }
      let perLine = Object.keys(seen).length;
      if (perLine < minColorsPerLine) {
        minColorsPerLine = perLine;
      }
      if (perLine > maxColorsPerLine) {
        maxColorsPerLine = perLine;
      }
    }
    let density = Math.round((minColorsPerLine + maxColorsPerLine) / 2);
    return {lookup: lookup, rgbItems: rgbItems, density: density};
  }

  then(cb) {
    this.parentLoader.fsacc.whenLoaded(cb);
  }

  numColors() {
    return this._numColors;
  }
}

module.exports.Loader = Loader;
module.exports.ImagePlane = ImagePlane;
module.exports.LookAtImage = LookAtImage;
