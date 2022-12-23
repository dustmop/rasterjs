const path = require('path');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');

module.exports = {
  entry: './index.js',
  output: {
    filename: 'raster.min.js',
    path: path.resolve(__dirname, 'dist'),
  },
  mode: 'production',
  optimization: {
    minimizer: [new UglifyJsPlugin()],
  }
};
