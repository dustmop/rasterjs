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

function putRect(plane, x0, y0, x1, y1, fill, color) {
  let tuple = splitColor(color);
  console.log(`putRect ${color} = ${tuple}`)

  x0 = Math.floor(x0);
  y0 = Math.floor(y0);
  x1 = Math.floor(x1);
  y1 = Math.floor(y1);

  let tmp;
  if (x0 > x1) {
    tmp = x0;
    x0 = x1;
    x1 = tmp;
  }
  if (y0 > y1) {
    tmp = y0;
    y0 = y1;
    y1 = tmp;
  }

  if (x0 >= plane.width) {
    return;
  }
  if (y0 >= plane.height) {
    return;
  }

  if (x0 < 0) {
    x0 = 0;
  }
  if (x1 >= plane.width) {
    x1 = plane.width;
  }
  if (y0 < 0) {
    y0 = 0;
  }
  if (y1 >= plane.height) {
    y1 = plane.height;
  }

  if (fill) {
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        //plane.buffer[x + y*plane.rowSize] = color;
        let k = (x + y*plane.rowSize)*4;
        plane.buffer[k+0] = tuple[0];
        plane.buffer[k+1] = tuple[1];
        plane.buffer[k+2] = tuple[2];
        plane.buffer[k+3] = 0xff;
      }
    }
  } else {
    let x, y;
    // Horizontal lines
    // TODO: putRange instead
    for (x = x0; x < x1; x++) {
      y = y0;
      //plane.buffer[x + y*plane.rowSize] = color;
      let k = (x + y*plane.rowSize)*4;
      plane.buffer[k+0] = tuple[0];
      plane.buffer[k+1] = tuple[1];
      plane.buffer[k+2] = tuple[2];
      plane.buffer[k+3] = 0xff;
      y = y1 - 1;
      //plane.buffer[x + y*plane.rowSize] = color;
      k = (x + y*plane.rowSize)*4;
      plane.buffer[k+0] = tuple[0];
      plane.buffer[k+1] = tuple[1];
      plane.buffer[k+2] = tuple[2];
      plane.buffer[k+3] = 0xff;
    }
    // Vertical lines
    // TODO: putRange instead
    for (y = y0; y < y1; y++) {
      x = x0;
      //plane.buffer[x + y*plane.rowSize] = color;
      let k = (x + y*plane.rowSize)*4;
      plane.buffer[k+0] = tuple[0];
      plane.buffer[k+1] = tuple[1];
      plane.buffer[k+2] = tuple[2];
      plane.buffer[k+3] = 0xff;
      x = x1 - 1;
      //plane.buffer[x + y*plane.rowSize] = color;
      k = (x + y*plane.rowSize)*4;
      plane.buffer[k+0] = tuple[0];
      plane.buffer[k+1] = tuple[1];
      plane.buffer[k+2] = tuple[2];
      plane.buffer[k+3] = 0xff;
    }
  }
}

function putPolygonFill(plane, points, color) {
  let numEdges;
  let edgeX = [];
  let edgeDir = [];
  let pixelX, pixelY;
  let i, j, swap, prev;
  let numCorners = 0;
  let polyYi, polyYj, polyXi, polyXj;

  let imageTop, imageBottom;
  let imageLeft, imageRight;
  imageTop = points[0].y;
  imageBottom = points[0].y;
  imageLeft = points[0].x;
  imageRight = points[0].x;
  numCorners++;

  let tuple = splitColor(color);

  // Count number of corners, and find polygon's top and bottom.
  for (i = 1; i < points.length; i++) {
    if (points[i].x < imageLeft) {
      imageLeft = points[i].x;
    }
    if (points[i].x > imageRight) {
      imageRight = points[i].x;
    }
    if (points[i].y < imageTop) {
      imageTop = points[i].y;
    }
    if (points[i].y > imageBottom) {
      imageBottom = points[i].y;
    }
    numCorners++;
  }

  let y0 = imageTop;
  let y1 = imageBottom;
  if (y0 < 0) {
    y0 = 0;
  }
  if (y1 >= plane.height) {
    y1 = plane.height - 1;
  }

  //  Loop through the rows of the image.
  for (pixelY = imageTop; pixelY <= imageBottom; pixelY++) {
    //  Build a list of edges.
    numEdges = 0;
    prev = numCorners-1;
    for (i = 0; i < numCorners; i++) {
      j = prev;
      prev = i;

      polyXi = points[i].x;
      polyXj = points[j].x;
      polyYi = points[i].y;
      polyYj = points[j].y;

      let scanlineY = pixelY;
      // If the current scanline's Y position overlaps the line segment.
      if ((polyYi <= scanlineY && polyYj >= scanlineY) ||
          (polyYj <= scanlineY && polyYi >= scanlineY)) {

        if (polyYi == polyYj) {
          continue;
        }

        // Calculate where the edge intersects the scanline.
        let deltaX = polyXj - polyXi;
        let deltaY = polyYj - polyYi;
        let slope = (pixelY-polyYi)/deltaY*deltaX;
        let intersect = Math.floor(polyXi + slope);
        let lineDirY = deltaY >= 0 ? 1 : -1;

        // If edge is already intersecting this pixel, and this edge
        // is going in the same direction, skip adding it.
        if (numEdges > 0) {
          let last = numEdges-1;
          if (edgeX[last] == intersect && edgeDir[last] == lineDirY) {
            continue;
          }
          if (edgeX[0] == intersect && edgeDir[0] == lineDirY) {
            continue;
          }
        }

        // Add the edge intersection.
        edgeX[numEdges] = intersect;
        edgeDir[numEdges] = lineDirY;
        numEdges++;
      }
    }

    //  Sort the numEdges, via a simple “Bubble” sort.
    i = 0;
    while (i < numEdges - 1) {
      if (edgeX[i] > edgeX[i+1]) {
        swap = edgeX[i];
        edgeX[i] = edgeX[i+1];
        edgeX[i+1]=swap;
        if (i) {
          i--;
        }
      }
      else {
        i++;
      }
    }

    // Fill the pixels between the edges.
    for (i=0; i < numEdges; i+=2) {
      let x0 = edgeX[i];
      let x1 = edgeX[i+1];
      if (x0 < 0) {
        x0 = 0;
      }
      if (x1 >= plane.width) {
        x1 = plane.width - 1;
      }
      for (pixelX=x0; pixelX<=x1; pixelX++) {
        let k = (pixelX + pixelY*plane.rowSize)*4;
        plane.buffer[k+0] = tuple[0];
        plane.buffer[k+1] = tuple[1];
        plane.buffer[k+2] = tuple[2];
        plane.buffer[k+3] = 0xff;
      }
    }
  }
}

function putPolygonOutline(plane, points, color) {
  let first, second;
  for (let k = 0; k < points.num; k++) {
    if (k < points.num - 1) {
      first.x  = points[k+0].x;
      second.x = points[k+1].x;
      first.y  = points[k+0].y;
      second.y = points[k+1].y;
    } else {
      first.x  = points[k].x;
      second.x = points[0].x;
      first.y  = points[k].y;
      second.y = points[0].y;
    }
    putLine(plane, first.x, first.y, second.x, second.y, color, true);
  }
}

module.exports.splitColor = splitColor;
module.exports.putLine = putLine;
module.exports.putRect = putRect;
module.exports.putPolygonFill = putPolygonFill;
module.exports.putPolygonOutline = putPolygonOutline;
