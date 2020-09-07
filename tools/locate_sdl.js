var fs = require('fs');
var path = require('path');

var SYSTEM_PATHS = [
  '/lib',
  '/usr/lib',
  '/usr/lib64',
  '/usr/local/lib',
  '/opt/local/lib',
  '/usr/lib/x86_64-linux-gnu',
  '/usr/lib/i386-linux-gnu',
  '/usr/lib/arm-linux-gnueabihf',
  '/usr/lib/arm-linux-gnueabi',
  '/usr/lib/aarch64-linux-gnu'
];

function locateSDL(mode) {
  let basename = '';
  for (let i = 0; i < SYSTEM_PATHS.length; i++) {
    let root = SYSTEM_PATHS[i];
    if (mode == 'include') {
      root = root.replace('/lib', '/include');
      basename = 'SDL2';
    } else {
      basename = 'libSDL2.dylib';
    }
    let locate = path.join(root, basename);
    if (fs.existsSync(locate)) {
      return locate;
    }
  }
  throw 'Not found';
}

var mode = process.argv[2];
process.stdout.write(locateSDL(mode));
