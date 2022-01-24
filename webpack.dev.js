const path = require('path');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');

module.exports = {
  entry: './index.js',
  output: {
    filename: 'raster.dev.js',
    path: path.resolve(__dirname, 'dist'),
  },
  mode: 'development'
};
