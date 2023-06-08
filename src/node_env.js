const cppmodule = require('../build/Release/native');
const argparse = require('argparse');
const fs = require('fs');
const path = require('path');
const saver = require('./save_image_display.js');
const filesysLocal = require('./filesys_local.js');
const httpDisplay = require('./http_display.js');
const nativeDisplay = require('./native_display.js');
const testDisplay = require('./test_display.js');

class NodeEnv {
  makeFilesysAccess() {
    return new filesysLocal.FilesysAccess();
  }

  displays() {
    let result = {};
    if (runningAsTest()) {
      result['test'] = ()=>{
        return new testDisplay.TestDisplay();
      };
    }
    for (let name of cppmodule.supports()) {
      result[name] = ()=>{
        return new nativeDisplay.NativeDisplay(cppmodule.make(name));
      };
    }
    result['sdl-failed'] = ()=>{
      console.log('SDL is not supported, serving rendered images over http. You can save as a png or gif using --save. If you set up SDL development libraries, you can run `npm install` again to enable SDL support.');
      return new httpDisplay.HTTPDisplay();
    }
    result['http'] = ()=>{
      return new httpDisplay.HTTPDisplay();
    }
    return result;
  };

  getOptions() {
    // If running as a test, don't parse command-line arguments. This allows
    // the test runner to process its own arguments instead.
    if (runningAsTest()) {
      return {};
    }

    // Only parse command-line args if script is an "app runner"
    // This means the script starts with `const ra = require('raster')`
    if (!this._isAppRunnerScript(process.argv)) {
      return {};
    }

    // Command-line arguments can also be disabled using the environment
    // variable "RASTERJS_NOARGV"
    if (process.env.RASTERJS_NOARGV) {
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
    parser.add_argument('--palette', {type: 'str'});
    parser.add_argument('--zoom', {type: 'int'});
    parser.add_argument('--tick', {type: 'int', dest: 'tick'});
    parser.add_argument('--full-trace', {action: 'store_true', dest: 'full'})
    parser.add_argument('-v', {action: 'store_true'});
    let args = parser.parse_args(cmdlineArgs);
    if (args.save_filename) {
      let fsacc = new filesysLocal.FilesysAccess();
      args.display = new saver.SaveImageDisplay(args.save_filename,
                                                args.num_frames, fsacc);
    }
    return args;
  }

  _isAppRunnerScript(argv) {
    if (!argv[0].endsWith('/node')) {
      return false;
    }

    let scriptName = argv[1];
    let content = fs.readFileSync(scriptName).toString();
    if (content.startsWith("const ra = require('raster')")) {
      return true;
    }
    if (content.startsWith('const ra = require("raster")')) {
      return true;
    }

    return false;
  }

  handleErrorGracefully(error) {
    throw error;
  }
}

function runningAsTest() {
  let args = process.argv;
  return (args[0].endsWith('/node') && args[1].endsWith('/mocha'));
}

function make() {
  return new NodeEnv();
}

module.exports.make = make;
