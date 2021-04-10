const displayWebGL = require('./display_webgl.js');
const plane = require('./plane.js');

function makeDisplay() {
  return new displayWebGL.Display();
}

function makePlane(disp) {
  // TODO: plane construct should accept this disp
  return new plane.Plane(disp);
}

module.exports.makeDisplay = makeDisplay;
module.exports.makePlane = makePlane;
