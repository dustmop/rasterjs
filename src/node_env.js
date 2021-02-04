const cppmodule = require('../build/Release/native');

function makeDisplay() {
  return cppmodule.display();
}

function makePlane() {
  return cppmodule.plane();
}

module.exports.makeDisplay = makeDisplay;
module.exports.makePlane = makePlane;
