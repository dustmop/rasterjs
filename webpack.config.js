const path = require('path');
const webpack = require('webpack');

module.exports = {
  entry: './index.js',
  output: {
    filename: 'main.js',
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
