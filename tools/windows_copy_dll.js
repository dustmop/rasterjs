const locateSDL = require('./locate_sdl.js');
const fs = require('fs');
const path = require('path');


function copyDynamicLibToBuild(sdlpath) {
  let basename = path.basename(sdlpath);
  let dest = path.join(__dirname, '../build/Release/', basename);
  console.log(`post-install script for Windows only: copying dynamic library from "${sdlpath}" to "${dest}"`);
  fs.copyFileSync(sdlpath, dest);
}


if (require.main === module) {
  if (process.platform != 'win32') {
    return;
  }
  copyDynamicLibToBuild(locateSDL.locateSDL('dll'));
}
