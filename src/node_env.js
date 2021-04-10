const cppmodule = require('../build/Release/native');

function makeResources() {
  return cppmodule.resources();
}

function makeDisplay() {
  return cppmodule.display();
}

function makePlane(res) {
  return cppmodule.plane(res);
}

module.exports.makeDisplay = makeDisplay;
module.exports.makePlane = makePlane;
module.exports.makeResources = makeResources;
