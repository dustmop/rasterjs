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
  // If running as a test, don't parse command-line arguments. This allows
  // the test runner to process it's own arguments instead.
  if (runningAsTest()) {
    return {};
  }
  const parser = new argparse.ArgumentParser({});
  parser.add_argument('--num-frames', {type: 'int'});
  let args = parser.parse_args();
  return args;
}

function runningAsTest() {
  let args = process.argv;
  return (args[0].endsWith('/node') && args[1].endsWith('/mocha'));
}

module.exports.makeDisplay = makeDisplay;
module.exports.makePlane = makePlane;
module.exports.makeResources = makeResources;
module.exports.getOptions = getOptions;
