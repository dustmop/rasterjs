const baseDisplay = require('./base_display.js');
const tiles = require('./tiles.js');


class TilesetBuilderDisplay extends baseDisplay.BaseDisplay {
  constructor(info) {
    super();
    info = info || {};
    let details = {
      tile_width: info.tile_width || 8,
      tile_height: info.tile_height || 8,
    }
    this._tileset = new tiles.Tileset(details);
    this._frames = [];
    this._numFrames = info.numFrames || 64;
  }

  appLoop(renderID, eachFrame) {
    for (let i = 0; i < this._numFrames; i++) {
      eachFrame();
      if (!this.isRunning()) {
        break;
      }
      let field = this._renderer.getFirstField();
      let pattern = this._tileset.addFrom(field);
      this._frames.push(pattern);
    }
  }

  getTileset() {
    return this._tileset;
  }

  getGraphicsData() {
    return {
      frames: this._frames,
      tileset: this._tileset,
    }
  }
}


module.exports.TilesetBuilderDisplay = TilesetBuilderDisplay;
