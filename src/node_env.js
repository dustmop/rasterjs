const cppmodule = require('../build/Release/native');
const argparse = require('argparse');
const gifRenderer = require('./gif_renderer.js');

function makeResources() {
  return cppmodule.resources();
}

function makeDisplay() {
  return cppmodule.display();
}

function makeRawBuffer(res) {
  return cppmodule.rawBuffer(res);
}

function getOptions() {
  // If running as a test, don't parse command-line arguments. This allows
  // the test runner to process it's own arguments instead.
  if (runningAsTest()) {
    return {};
  }
  const parser = new argparse.ArgumentParser({});
  parser.add_argument('--num-frames', {type: 'int'});
  parser.add_argument('--gif', {type: 'str', dest: 'gif_filename'});
  let args = parser.parse_args();
  args.display = null;
  if (args.gif_filename) {
    args.display = new gifRenderer.GifRenderer(args.gif_filename,
                                               args.num_frames);
  }
  return args;
}

function runningAsTest() {
  let args = process.argv;
  return (args[0].endsWith('/node') && args[1].endsWith('/mocha'));
}

module.exports.makeDisplay = makeDisplay;
module.exports.makeRawBuffer = makeRawBuffer;
module.exports.makeResources = makeResources;
module.exports.getOptions = getOptions;
