const cppmodule = require('../build/Release/native');
const argparse = require('argparse');
const path = require('path');
const saver = require('./save_image_display.js');

function makeFilesysAccess() {
  let fsacc = cppmodule.filesysAccess();
  // TODO: this method shouldn't be needed, the loader should do this
  fsacc.localAsset = function(filename) {
    return path.posix.join(__dirname, '../', filename);
  }
  return fsacc;
}

function makeDisplay() {
  return cppmodule.display();
}

function getOptions() {
  // If running as a test, don't parse command-line arguments. This allows
  // the test runner to process its own arguments instead.
  if (runningAsTest()) {
    return {};
  }
  const parser = new argparse.ArgumentParser({});
  parser.add_argument('--num-frames', {type: 'int'});
  parser.add_argument('--save', {type: 'str', dest: 'save_filename'});
  parser.add_argument('--display', {type: 'str'});
  parser.add_argument('--colors', {type: 'str'});
  parser.add_argument('--zoom', {type: 'int'});
  let args = parser.parse_args();
  if (args.save_filename) {
    let fsacc = cppmodule.filesysAccess();
    args.display = new saver.SaveImageDisplay(args.save_filename,
                                              args.num_frames, fsacc);
  }
  return args;
}

function runningAsTest() {
  let args = process.argv;
  return (args[0].endsWith('/node') && args[1].endsWith('/mocha'));
}

module.exports.makeDisplay = makeDisplay;
module.exports.makeFilesysAccess = makeFilesysAccess;
module.exports.getOptions = getOptions;
