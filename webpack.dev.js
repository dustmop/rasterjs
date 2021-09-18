const path = require('path');
const webpack = require('webpack');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');

module.exports = {
  entry: './index.js',
  output: {
    filename: 'raster.dev.js',
    path: path.resolve(__dirname, 'dist'),
  },
  mode: 'development',
  plugins: [
    new webpack.DefinePlugin({
      "process.env": {
        WEBPACK_COMPILE_FOR_BROWSER: JSON.stringify(true)
      }
    })
  ]
};
