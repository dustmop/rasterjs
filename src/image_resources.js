const types = require('./types.js');
const imageField = require('./image_field.js');


class ImageResources {
  constructor(refScene) {
    if (!types.isWeakRef(refScene)) {
      throw new Error('needs weak ref for scene object')
    }
    console.log(refScene.deref());
    this.refScene = refScene;
    this._holding = {};
  }

  insert(ident, imageSurf) {
    if (!types.isSurface(imageSurf)) {
      throw new Error(`insert: expects surface`);
    }
    this._holding[ident] = imageSurf;
  }

  lookup(ident) {
    if (this._holding[ident]) {
      let foundSurf = this._holding[ident];
      let fieldPitch = foundSurf.width;
      let imgField = new imageField.ImageField();
      imgField.offsetTop = foundSurf.offsetTop || 0;
      imgField.offsetLeft = foundSurf.offsetLeft || 0;
      imgField.rgbBuff = foundSurf.buff;
      imgField.width = foundSurf.width;
      imgField.pitch = fieldPitch;
      imgField.height = foundSurf.height;
      imgField.palette = this.refScene.deref().palette;
      if (imgField.palette == null) {
        throw new Error('scene does not have a palette');
      }
      imgField.loadState = imageField.LOAD_STATE_READ;
      imgField.fillData();
      return imgField;
    }
  }
};


module.exports.ImageResources = ImageResources;
