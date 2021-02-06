function abs(n) {
  return Math.abs(n);
}

function splitColor(color) {
  let r = Math.floor(color / 0x10000) % 0x100;
  let g = Math.floor(color / 0x100) % 0x100;
  let b = Math.floor(color) % 0x100;
  return [r, g, b, 0xff];
}

function putLine(plane, x0, y0, x1, y1, color, connectCorners) {

  x0 = Math.floor(x0);
  y0 = Math.floor(y0);
  x1 = Math.floor(x1);
  y1 = Math.floor(y1);

  let deltax = x1 - x0;
  let deltay = y1 - y0;
  let tuple = splitColor(color);

  if (abs(deltay) <= abs(deltax)) {

    if (deltax < 0) {
      tmp = x0;
      x0 = x1;
      x1 = tmp;
      tmp = y0;
      y0 = y1;
      y1 = tmp;
      deltax = -deltax;
      deltay = -deltay;
    }

    if (connectCorners) {
      if (deltay >= 0) {
        deltay++;
      } else {
        deltay--;
      }
    }

    let dist = 2 * abs(deltay) - deltax;
    if (connectCorners) {
      dist = 2 * abs(deltay) - 2 * deltax;
    }

    let y = y0;
    for (let x = x0; x <= x1; x++) {
      let pitch = plane.rowSize*4;
      // Draw a pixel
      if (x >= 0 && x < plane.width && y >= 0 && y < plane.height) {
        let k = (x + y*plane.rowSize)*4;
        plane.buffer[k+0] = tuple[0];
        plane.buffer[k+1] = tuple[1];
        plane.buffer[k+2] = tuple[2];
        plane.buffer[k+3] = 0xff;
      }

      if (dist > 0) {
        if (deltay > 0) {
          y = y + 1;
        } else if (deltay < 0) {
          y = y - 1;
        }
        dist = dist - 2*deltax;
      }
      dist = dist + 2*abs(deltay);
    }
  } else {

    if (deltay < 0) {
      tmp = x0;
      x0 = x1;
      x1 = tmp;
      tmp = y0;
      y0 = y1;
      y1 = tmp;
      deltax = -deltax;
      deltay = -deltay;
    }

    if (connectCorners) {
      if (deltax >= 0) {
        deltax++;
      } else {
        deltax--;
      }
    }

    let dist = 2 * abs(deltax) - deltay;
    if (connectCorners) {
      dist = 2 * abs(deltax) - 2 * deltay;
    }
    let x = x0;
    for (let y = y0; y <= y1; y++) {
      // Draw a pixel
      if (x >= 0 && x < plane.width && y >= 0 && y < plane.height) {
        let k = (x + y*plane.rowSize)*4;
        plane.buffer[k+0] = tuple[0];
        plane.buffer[k+1] = tuple[1];
        plane.buffer[k+2] = tuple[2];
        plane.buffer[k+3] = 0xff;
      }

      if (dist > 0) {
        if (deltax > 0) {
          x = x + 1;
        } else if (deltax < 0) {
          x = x - 1;
        }
        dist = dist - 2*deltay;
      }
      dist = dist + 2*abs(deltax);
    }
  }
}

module.exports.putLine = putLine;
