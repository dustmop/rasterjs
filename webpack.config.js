const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
  entry: './index.js',
  output: {
    filename: 'raster.min.js',
    path: path.resolve(__dirname, 'dist'),
  },
  mode: 'production',
  optimization: {
    minimize: true,
    minimizer: [new TerserPlugin()],
  }
};
