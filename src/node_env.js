const cppmodule = require('../build/Release/native');

function makeDisplay() {
  return cppmodule.display();
}

function makePlane(disp) {
  return cppmodule.plane(disp);
}

module.exports.makeDisplay = makeDisplay;
module.exports.makePlane = makePlane;
