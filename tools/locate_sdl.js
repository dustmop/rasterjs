var fs = require('fs');
var path = require('path');

var LIB_PATHS = [
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
  if (mode != 'include' && mode != 'lib' && mode != 'dll' && mode != 'symbol') {
    throw new Error(`illegal mode "${mode}", use "include", "lib", 'dll', or "symbol"`);
  }
  if (process.platform == 'darwin') {
    return locateSDLMacos(mode);
  } else if (process.platform == 'win32') {
    return locateSDLWindows(mode);
  } else if (process.platform == 'linux') {
    return locateSDLLinux(mode);
  } else {
    throw new Error(`unknown platform "${process.platform}"`);
  }
}

function locateSDLMacos(mode) {
  let basename = '';
  for (let i = 0; i < LIB_PATHS.length; i++) {
    let root = LIB_PATHS[i];
    if (mode == 'include') {
      root = root.replace('/lib', '/include');
      basename = 'SDL2';
    } else if (mode == 'lib') {
      basename = 'libSDL2.dylib';
    } else if (mode == 'dll') {
      root = root.replace('/lib', '/bin');
      basename = 'SDL2.dll';
    } else if (mode == 'symbol') {
      basename = 'libSDL2.dylib';
    }
    let locate = path.posix.join(root, basename);
    if (fs.existsSync(locate)) {
      if (mode == 'symbol') {
        return 'SDL_ENABLED';
      }
      return locate;
    }
  }
  if (mode == 'symbol') {
    return 'SDL_DISABLED';
  }
  return '';
}

function locateSDLWindows(mode) {
  if (mode == 'include') {
    let dir = getWindowsSDLDir('c:/SDL/');
    return path.posix.join(dir, "/include/SDL2");
  } else if (mode == 'lib') {
    let dir = getWindowsSDLDir('c:/SDL/');
    return path.posix.join(dir, "/lib/libSDL2.dll.a");
  } else if (mode == 'dll') {
    let dir = getWindowsSDLDir('c:/SDL/');
    return path.posix.join(dir, "/bin/SDL2.dll");
  } else if (mode == 'symbol') {
    let dir = getWindowsSDLDir('c:/SDL/');
    if (fs.existsSync(path.posix.join(dir, "/lib/libSDL2.dll.a"))) {
      return 'SDL_ENABLED';
    }
    return 'SDL_DISABLED';
  }
}

function locateSDLLinux(mode) {
  if (fs.existsSync('/opt/vc/include/bcm_host.h')) {
    return locateRaspberryPI(mode);
  }
  throw new Error(`TODO: linux (non-rpi) support`);
}

function locateRaspberryPI(mode) {
  if (mode == 'include') {
    return [
      '/opt/vc/include/',
      '/opt/vc/include/interface/vmcs_host/linux',
    ].join('\n');
  } else if (mode == 'lib') {
    return [
      '/usr/lib/arm-linux-gnueabihf/libpng.a',
      '/usr/lib/arm-linux-gnueabihf/libm.a',
      '/opt/vc/lib/libbcm_host.so',
      '/opt/vc/lib/libvchostif.a',
    ].join('\n');
  } else if (mode == 'dll') {
    return '';
  } else if (mode == 'symbol') {
    return 'RASPBERRYPI';
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

module.exports.locateSDL = locateSDL;

if (require.main === module) {
  var mode = process.argv[2];
  process.stdout.write(locateSDL(mode));
}
