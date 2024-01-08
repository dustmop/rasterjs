const algorithm = require('./algorithm');


class Compositor {
  constructor() {
    this._create = null;
  }

  combine(surfaceList, width, height, zoomLevel) {
    let totalWidth = width * zoomLevel;
    let totalHeight = height * zoomLevel;
    if (this._create == null) {
      this._create = algorithm.makeSurface(totalWidth, totalHeight);
    }

    for (let i = 0; i < surfaceList.length; i++) {
      let surface = surfaceList[i];
      if (surface == null) {
        continue;
      } else if (zoomLevel > 1) {
        surface = algorithm.nearestNeighborSurface(surface, zoomLevel);
      }
      algorithm.mergeIntoSurface(this._create, surface);
    }
    let surface = surfaceList.grid;
    if (surface) {
      algorithm.mergeIntoSurface(this._create, surface);
    }

    return [this._create];
  }
}


module.exports.Compositor = Compositor;
