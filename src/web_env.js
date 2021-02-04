const displayWebGL = require('./display_webgl.js');
const plane = require('./plane.js');

function makeDisplay() {
  return new displayWebGL.Display();
}

function makePlane() {
  return new plane.Plane();
}

module.exports.makeDisplay = makeDisplay;
module.exports.makePlane = makePlane;
