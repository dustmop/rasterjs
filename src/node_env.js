const cppmodule = require('../build/Release/native');
const argparse = require('argparse');
const path = require('path');
const saver = require('./save_image_display.js');
const filesysLocal = require('./filesys_local.js');
const httpDisplay = require('./http_display.js');

function makeFilesysAccess() {
  let fsacc = new filesysLocal.FilesysAccess();
  return fsacc;
}

function makeDisplay(name) {
  if (!name) {
    // default: detect the display. use either `sdl` (default) or `http`
    let display = cppmodule.display();
    if (display.name() == 'fake') {
      return new httpDisplay.HTTPDisplay();
    }
    return display
  };
  if (name == 'sdl') {
    // force the `sdl` backend, even if it is `fake`
    return cppmodule.display();
  } else if (name == 'http') {
    return new httpDisplay.HTTPDisplay();
  }
}

var _fullStackTrace = false;

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
  parser.add_argument('--time-tick', {type: 'int', dest: 'time_tick'});
  parser.add_argument('--full-trace', {action: 'store_true', dest: 'full'})
  parser.add_argument('-v', {action: 'store_true'});
  let args = parser.parse_args(cmdlineArgs);
  if (args.save_filename) {
    let fsacc = new filesysLocal.FilesysAccess();
    args.display = new saver.SaveImageDisplay(args.save_filename,
                                              args.num_frames, fsacc);
  }
  _fullStackTrace = args.full;
  return args;
}

function runningAsTest() {
  let args = process.argv;
  return (args[0].endsWith('/node') && args[1].endsWith('/mocha'));
}

function handleErrorGracefully(err, _display) {
  if (_fullStackTrace) {
    console.log(err);
    process.exit(1);
  }
  let trace = _removeStackUntilAboveRasterScene(err);
  process.stderr.write(trace);
  process.exit(1);
}

function _removeStackUntilAboveRasterScene(err) {
  let lines = err.stack.split('\n');
  lines = lines.slice(1); // remove reason
  let target = 'rasterjs/src/scene.js:';
  let target2 = 'rasterjs/src/';
  let st = 0;
  let i = 0;
  let build = [];
  while (i < lines.length) {
    if (st == 0) {
      if (lines[i].indexOf(target) > -1) {
        // found the first line within scene impl
        st = 1;
        continue;
      }
    } else if (st == 1) {
      if (lines[i].indexOf(target) == -1) {
        // found following line *without* scene
        st = 2;
        continue;
      }
    } else if (st == 2) {
      if (lines[i].indexOf(target2) == -1) {
        build.push(lines[i]);
      }
    }
    i++;
  }
  return err.name + ': ' + err.message + '\n' + build.join('\n');
}

module.exports.makeDisplay = makeDisplay;
module.exports.makeFilesysAccess = makeFilesysAccess;
module.exports.getOptions = getOptions;
module.exports.handleErrorGracefully = handleErrorGracefully;
