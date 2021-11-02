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
  if (mode != 'include' && mode != 'lib') {
    throw new Error(`illegal mode "${mode}", use "include" or "lib"`);
  }
  if (process.platform == 'darwin') {
    return locateSDLMacos(mode);
  } else if (process.platform == 'win32') {
    return locateSDLWindows(mode);
  } else {
    throw new Error(`unknown platform "${process.platform}"`);
  }
}

function locateSDLMacos(mode) {
  let basename = '';
  for (let i = 0; i < SYSTEM_PATHS.length; i++) {
    let root = SYSTEM_PATHS[i];
    if (mode == 'include') {
      root = root.replace('/lib', '/include');
      basename = 'SDL2';
    } else {
      basename = 'libSDL2.dylib';
    }
    let locate = path.posix.join(root, basename);
    if (fs.existsSync(locate)) {
      return locate;
    }
  }
  throw 'Not found';
}

function locateSDLWindows(mode) {
  if (mode == 'include') {
    let dir = getWindowsSDLDir('c:/SDL/');
    return path.posix.join(dir, "/include/SDL2");
  } else {
    let dir = getWindowsSDLDir('c:/SDL/');
    return path.posix.join(dir, "/lib/libSDL2.dll.a");
  }
}

function getWindowsSDLDir(base) {
  if (process.env.SDL_PATH) {
    base = process.env.SDL_PATH;
  }
  let path = findFolderInDir(base, /^SDL2-[\d]+\.[\d]+\.[\d]+$/);
  path = findFolderInDir(path, /^x86_64.*$/);
  if (!path) {
    throw new Error('SDL not found, expected at c:\\SDL\\, or set SDL_PATH');
  }
  return path;
}

function findFolderInDir(dir, regex) {
  try {
    let ents = fs.readdirSync(dir);
    for (let i = 0; i < ents.length; i++) {
      let folder = ents[i];
      let match = folder.match(regex);
      if (match) {
        return path.posix.join(dir, folder);
      }
    }
  } catch (e) {
    // pass
  }
  return '';
}

if (require.main === module) {
  var mode = process.argv[2];
  process.stdout.write(locateSDL(mode));
}
