const scene = require('./scene.js');

////////////////////////////////////////
// Export

var env = null;
if (typeof window === 'undefined' && typeof process !== 'undefined') {
  // Node.js
  env = require('./node_env.js');
} else {
  // Webpack or browserify
  env = require('./web_env.js');
}

var singleton = new scene.Scene(env);
singleton.newInstance = function() {
  return new scene.Scene(env);
}

if (typeof module !== 'undefined') {
  // Node.js or browserify
  module.exports = singleton;
}

if (typeof window !== 'undefined') {
  // Webpack
  window['require'] = function(moduleName) {
    if (moduleName === 'raster') {
      return singleton;
    }
    throw 'Could not require module named "' + moduleName + '"';
  };
}
