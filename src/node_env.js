const cppmodule = require('../build/Release/native');
const argparse = require('argparse');
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
    // TODO: only parse command-line args if raster.js is an "app runner"
    // TODO: startswith(read(process.argv[1])) == "const ra = require('raster')"

    // A user of raster.js can disable command-line arguments entirely by
    // adding "dev_rasterjs.noargv" to their package.json:
    // {
    //   "name": "_your_package_",
    //   ...
    //   "dev_rasterjs": { "noargv": true }
    // }
    try {
      let currDir = process.cwd();
      const thisPackageJson = require(path.join(currDir, 'package.json'));
      if (thisPackageJson.dev_rasterjs.noargv === true) {
        return {};
      }
    } catch (e) {
      // pass
    }

    // Command-line arguments can also be disabled using the environment
    // variable "RASTERJS_NOARGV"
    if (process.env.RASTERJS_NOARGV) {
      return {};
    }

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
