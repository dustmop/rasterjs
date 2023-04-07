const path = require('path');

module.exports = {
  entry: './index.js',
  output: {
    filename: 'raster.dev.js',
    path: path.resolve(__dirname, 'dist'),
  },
  mode: 'development'
};
