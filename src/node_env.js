const cppmodule = require('../build/Release/native');
const argparse = require('argparse');
const path = require('path');
const saver = require('./save_image_display.js');
const filesysLocal = require('./filesys_local.js');

function makeFilesysAccess() {
  let fsacc = new filesysLocal.FilesysAccess();
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

  // Skip any command-line args after "--"
  let cmdlineArgs = process.argv.slice(2);
  let pos = cmdlineArgs.indexOf('--');
  if (pos >= 0) {
    cmdlineArgs = cmdlineArgs.slice(0, pos);
  }

  // Parse them
  const parser = new argparse.ArgumentParser({});
  parser.add_argument('--num-frames', {type: 'int'});
  parser.add_argument('--save', {type: 'str', dest: 'save_filename'});
  parser.add_argument('--display', {type: 'str'});
  parser.add_argument('--colors', {type: 'str'});
  parser.add_argument('--zoom', {type: 'int'});
  parser.add_argument('-v', {action: 'store_true'});
  let args = parser.parse_args(cmdlineArgs);
  if (args.save_filename) {
    let fsacc = new filesysLocal.FilesysAccess();
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
