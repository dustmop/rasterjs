const rgbColor = require('./rgb_color.js');
const algorithm = require('./algorithm.js');
const quantizer = require('./quantizer.js');
const palette = require('./palette.js');
const types = require('./types.js');
const weak = require('./weak.js');
const verboseLogger = require('./verbose_logger.js');

let verbose = new verboseLogger.Logger();

const LOAD_STATE_NONE = 0;
const LOAD_STATE_OPENED = 1;
const LOAD_STATE_READ = 2;
const LOAD_STATE_FILLED = 3;
const LOAD_STATE_ERROR = -1;

class Loader {
  constructor(fsacc, refScene) {
    if (!types.isWeakRef(refScene)) {
      throw new Error('needs weak ref for scene object')
    }
    this.list = [];
    this.addedFiles = {};
    this.fsacc = fsacc;
    this.refScene = refScene;
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

    let useAsync = !!opt['async'];
    let palette = this.refScene.deref().palette;
    palette.ensureExpandingIfCurrentlyPending();

    if (this.addedFiles[filename]) {
      let found = this.addedFiles[filename];
      let planePitch = found.width;
      let imgPlane = new ImagePlane();
      imgPlane.offsetTop = found.offsetTop || 0;
      imgPlane.offsetLeft = found.offsetLeft || 0;
      imgPlane.rgbBuff = found.buff;
      imgPlane.width = found.width;
      imgPlane.pitch = planePitch;
      imgPlane.height = found.height;
      imgPlane.palette = palette;
      imgPlane.loadState = LOAD_STATE_READ;
      imgPlane.fillData();
      return imgPlane;
    }

    let self = this;

    let img = new ImagePlane();
    img.refLoader = new weak.Ref(this);
    img.filename = filename;
    img.id = this.list.length;
    img.palette = palette;
    img.sortUsingHSV = sortUsingHSV;
    img.offsetLeft = 0;
    img.offsetTop = 0;
    img.loadState = LOAD_STATE_NONE;
    img.width = 0;
    img.height = 0;
    img.pitch = 0;
    img.data = null;

    // 0 success sync, 1 pending async
    let ret = this.fsacc.readImageData(filename, img, useAsync);
    if (ret == 1) {
      img.loadState = LOAD_STATE_OPENED; // async
      this.list.push(img);
      return img;
    }

    types.ensureIsOneOf(img.rgbBuff, ['Buffer', 'Uint8Array']);
    img.fillData();
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

class LookOfImage {
  constructor(items, density) {
    if (!density) {
      throw new Error(`LookOfImage needs density parameter`);
    }
    // Clone the list of items
    this._items = items.slice();
    this._density = density;
    // TODO: all, rows
    this.length = items.length;
    this._min = Math.min(...items);
    this._max = Math.max(...items);
    return this;
  }

  // replace with `allToInts` or `rowsToInts`
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

  find(cv) {
    return this._items.indexOf(cv);
  }
}

class ImagePlane {
  constructor() {
    this.refLoader = null;
    this.filename = null;
    this.id = null;
    this.slice = null;
    this.width = 0;
    this.height = 0;
    this.data = null;
    this.alpha = null;
    this.rgbBuff = null;
    this.palette = null;
    this.sortUsingHSV = false;
    return this;
  }

  whenRead() {
    this.loadState = LOAD_STATE_READ;
    let collect = this.refLoader.deref();
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
    make.refLoader = this.refLoader;
    make.filename = this.filename;
    make.id = this.id;
    make.offsetLeft = x;
    make.offsetTop = y;
    make.width = w;
    make.height = h;
    make.pitch = this.pitch;
    make.data = this.data;
    make.alpha = this.alpha;
    make.rgbBuff = this.rgbBuff;
    make.palette = this.palette;
    make.sortUsingHSV = this.sortUsingHSV;
    return make;
  }

  clone() {
    let make = new ImagePlane();
    make.refLoader = this.refLoader;
    make.filename = this.filename;
    make.id = this.id;
    make.offsetLeft = this.offsetLeft;
    make.offsetTop = this.offsetTop;
    make.width = this.width;
    make.height = this.height;
    make.pitch = this.pitch;
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

  // TODO: make wrapper of this that's convenient to pass a filename / Image to
  fillData() {
    this.loadState = LOAD_STATE_FILLED;
    if (this.data == null) {
      let numPixels = this.height * this.width;
      this.data = new Uint8Array(numPixels);
      this.alpha = new Uint8Array(numPixels);
    }

    if (this.filename &&
        (this.filename.endsWith('.jpg') || this.filename.endsWith('.jpeg'))) {
      let quant = new quantizer.Quantizer();
      let quantizedRes = quant.colorQuantize(this.rgbBuff);
      this.palette.setRGBMap(quantizedRes.colors);
      this.rgbBuff = quantizedRes.rgbBuff;
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

    let map = this._translateRGBItems(needs.rgbItems, this.palette);

    verbose.log(`loading image with rgb map: ${JSON.stringify(map.xlat)}`, 6);

    // Look of the image, see the used color values
    this.look = new LookOfImage(map.items, needs.density);
    //
    // # Why is this a LookOfImage object?
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
    // array, but needs to be some sort of object.
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
    // # Maybe a use case with colorspace?
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
        let c = map.xlat[rgbval];
        if (map.inverter) {
          c = map.inverter[c] || 0;
        }
        this.data[k] = c;
      }
    }

    this._numColors = numColors;
  }

  // Iterate the 32-bit RGB pixels of the image, and calculate the following;
  //  rgbItems: list[rgbval]
  //  density:  int ;; approximate median number of colors per line
  //  votes:    map[rgbval: count how many uses]
  _collectColorNeeds() {
    let lookup = {};
    let rgbItems = [];
    let votes = {};
    let minColorsPerLine = 9999;
    let maxColorsPerLine = 0;
    for (let y = 0; y < this.height; y++) {
      let seenPerLine = {};
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
        votes[rgbval] = (votes[rgbval] || 0) + 1;
        seenPerLine[rgbval] = (seenPerLine[rgbval] || 0) + 1;
        if (lookup[rgbval] !== undefined) {
          continue;
        }
        // New rgb color found, add it
        lookup[rgbval] = rgbItems.length;
        rgbItems.push(new rgbColor.RGBColor(rgbval));
      }
      let perLine = Object.keys(seenPerLine).length;
      if (perLine < minColorsPerLine) {
        minColorsPerLine = perLine;
      }
      if (perLine > maxColorsPerLine) {
        maxColorsPerLine = perLine;
      }
    }
    let density = Math.round((minColorsPerLine + maxColorsPerLine) / 2);
    return {rgbItems: rgbItems, density: density, votes: votes};
  }

  // for each rgb item, find its position in the rgbmap. If it is not
  // found, add it if the palette is expandable; if the palette is
  // pending then it is expandable. Otherwise, round it to the nearest
  // color, and return that colors position.
  _translateRGBItems(rgbItems, palette) {
    let xlat = {};
    let items = [];
    for (let i = 0; i < rgbItems.length; i++) {
      let rgbval = rgbItems[i].toInt();
      let c = palette.locateRGB(rgbval);
      if (c == null) {
        if (palette.isExpandable()) {
          c = palette.addRGBMap(rgbval);
        } else {
          // TODO: Implement me!
          throw new Error(`IMPLEMENT ME: palette.roundNearestColor`);
          c = palette.roundNearestColor(rgbval);
        }
      }
      xlat[rgbval] = c;
      items.push(c);
    }

    let inverter = null;
    if (palette._entries) {
      inverter = {};
      // if there's palette entries, create an inverter for them
      for (let i = 0; i < palette._entries.length; i++) {
        let cv = palette._entries[i];
        inverter[cv] = i;
      }
    }

    return {xlat:xlat, items:items, inverter:inverter};
  }

  then(cb) {
    let loader = this.refLoader.deref();
    loader.fsacc.whenLoaded(cb);
  }

  numColors() {
    return this._numColors;
  }
}

module.exports.Loader = Loader;
module.exports.ImagePlane = ImagePlane;
module.exports.LookOfImage = LookOfImage;
