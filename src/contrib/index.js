const tiledImporter = require('./tiled_importer.js');

function load() {
  return {
    TiledImporter: tiledImporter.TiledImporter,
  };
}

module.exports.load = load;
