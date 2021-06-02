const cppmodule = require('../build/Release/native');
const argparse = require('argparse');

function makeResources() {
  return cppmodule.resources();
}

function makeDisplay() {
  return cppmodule.display();
}

function makePlane(res) {
  return cppmodule.plane(res);
}

function getOptions() {
  const parser = new argparse.ArgumentParser({});
  parser.add_argument('--num-frames', {type: 'int'});
  let args = parser.parse_args();
  return args;
}

module.exports.makeDisplay = makeDisplay;
module.exports.makePlane = makePlane;
module.exports.makeResources = makeResources;
module.exports.getOptions = getOptions;
