const algorithm = require('./algorithm');


class Compositor {
  constructor() {}

  combine(surfaceList, width, height, zoomLevel) {
    let totalWidth = width * zoomLevel;
    let totalHeight = height * zoomLevel;
    let create = algorithm.makeSurface(totalWidth, totalHeight);

    for (let i = 0; i < surfaceList.length; i++) {
      let surface = surfaceList[i];
      if (surface == null) {
        continue;
      } else if (zoomLevel > 1) {
        surface = algorithm.nearestNeighborSurface(surface, zoomLevel);
      }
      algorithm.mergeIntoSurface(create, surface);
    }
    let surface = surfaceList.grid;
    if (surface) {
      algorithm.mergeIntoSurface(create, surface);
    }

    return [create];
  }
}


module.exports.Compositor = Compositor;
