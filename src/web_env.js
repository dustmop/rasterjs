const displayWebGL = require('./display_webgl.js');
const plane = require('./plane.js');
const resources = require('./resources.js');

function makeResources() {
  return new resources.Resources();
}

function makeDisplay() {
  return new displayWebGL.Display();
}

function makePlane(res) {
  // TODO: plane constructor should accept this resources handle
  return new plane.Plane(res);
}

module.exports.makeDisplay = makeDisplay;
module.exports.makePlane = makePlane;
module.exports.makeResources = makeResources;
