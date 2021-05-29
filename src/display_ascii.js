function DisplayAscii() {
  this.plane = null;
  return this;
}

DisplayAscii.prototype.initialize = function() {
}

DisplayAscii.prototype.createWindow = function(plane, zoomLevel) {
  this.plane = plane;
}

DisplayAscii.prototype.appRenderAndLoop = function(nextFrame) {
  let image = {
    palette: [],
    buffer: [],
    pitch: null,
  };
  this.plane.retrieveTrueContent(image);
  let line = '';
  for (let k = 0; k < image.buffer.length; k++) {
    if ((k > 0) && (k % image.pitch == 0)) {
      line += '\n';
      process.stdout.write(line);
      line = '';
    }
    line += byteToAscii(image.buffer[k]);
  }
  if (line != '') {
    line += '\n';
    process.stdout.write(line);
  }
}

function byteToAscii(b) {
  if (b == 0) {
    return ' ';
  } else if (b == 1) {
    return '.';
  } else if (b == 2) {
    return '_';
  } else if (b == 3) {
    return '-';
  } else if (b == 4) {
    return '=';
  } else if (b == 5) {
    return '/';
  } else if (b == 6) {
    return '|';
  } else if (b == 20) {
    return 'v';
  } else if (b == 24) {
    return 'x';
  } else if (b == 25) {
    return '*';
  } else if (b == 26) {
    return 'X';
  } else if (b == 28) {
    return 'A';
  } else if (b == 29) {
    return '%';
  } else if (b == 30) {
    return 'y';
  } else if (b == 31) {
    return 'Y';
  }
  return '?';
}

module.exports.DisplayAscii = DisplayAscii;

