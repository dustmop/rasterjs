const imageField = require('./image_field.js');
const palette = require('./palette.js');
const types = require('./types.js');
const weak = require('./weak.js');

class Loader {
  constructor(fsacc, refScene) {
    if (!types.isWeakRef(refScene)) {
      throw new Error('needs weak ref for scene object')
    }
    this.fsacc = fsacc;
    this.refScene = refScene;
    this.clear();
    this._resources = null;
    return this;
  }

  loadImage(filename, opt) {
    let sortUsingHSV = false;
    let asAliasString = filename;
    if (opt.sortColors) {
      if (opt.sortColors == 'usingHSV') {
        sortUsingHSV = true;
      } else {
        throw new Error(`unknown sortColors key "${opt.sortColors}"`);
      }
    } else if (Object.keys(opt) > 0) {
      throw new Error(`unknown option value ${opt}`);
    }
    if (opt.as) {
      asAliasString = opt.as;
    }

    let useAsync = !!opt['async'];
    let palette = this.refScene.deref().palette;
    palette.ensureExpandingIfCurrentlyPending();

    if (this._resources) {
      let img = this._resources.lookup(filename);
      if (img) {
        return img;
      }
    }

    if (this.references[asAliasString] != null) {
      let index = this.references[asAliasString];
      return this.list[index];
    }

    let img = new imageField.ImageField();
    img.refLoader = new weak.Ref(this);
    img.filename = filename;
    img.id = this.list.length;
    img.palette = palette;
    img.sortUsingHSV = sortUsingHSV;
    img.offsetLeft = 0;
    img.offsetTop = 0;
    img.loadState = imageField.LOAD_STATE_NONE;
    img.width = 0;
    img.height = 0;
    img.pitch = 0;
    img.data = null;

    // 0 success sync, 1 pending async
    let ret = this.fsacc.readImageData(filename, img, useAsync);
    this.references[asAliasString] = this.list.length;
    this.list.push(img);

    if (ret == 1) {
      img.loadState = imageField.LOAD_STATE_OPENED; // async
      return img;
    }

    types.ensureIsOneOf(img.rgbBuff, ['Buffer', 'Uint8Array']);
    img.fillData();
    return img;
  }

  useResources(resources) {
    if (resources.refScene == null) {
      throw new Error('resources must have a weak ref to scene');
    }
    this._resources = resources;
  }

  clear() {
    this.list = [];
    this.references = {};
  }
}


module.exports.Loader = Loader;
