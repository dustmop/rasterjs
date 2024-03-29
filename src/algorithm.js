const palette = require('./palette.js');
const rgbColor = require('./rgb_color.js');
const types = require('./types.js');

function midpointCircleRasterize(r) {
  if (!r) {
    return [];
  }
  // Only allow radius to be a whole number, or 0.5 more than a whole number.
  r = Math.round(r * 2) / 2;
  // Special case for some small circles, to make them look better.
  if (r == 1.5) {
    return [[1,0],[0,1]];
  } else if (r == 3.0) {
    return [[3,1],[2,2]];
  } else if (r == 5.5) {
    return [[5,0],[5,1],[4,2],[4,3]];
  } else if (r == 7.0) {
    return [[7,1],[7,2],[6,3],[6,4],[5,5]];
  }
  // Construct the arc.
  let arc = new Array();
  let y = 0;
  let x = r;
  let rSquared = r * r;
  // Sample pixels from their center.
  x -= 0.5;
  if (isHalfwayValue(x)) {
    y += 0.5;
  }
  let xSquared = x * x;
  let ySquared = y * y;
  // Loop increments Y each step, and decrements X occasionally, based upon
  // error accumulation. Eventually X==Y, which breaks the loop.
  while (true) {
    // Invariant: x * x == xSquared && y * y == ySquared
    let dist = xSquared + ySquared;
    if (dist > rSquared) {
      xSquared = xSquared - 2 * x + 1;
      x -= 1;
    }
    if (x < y) {
      break;
    }
    arc.push([Math.ceil(x), Math.ceil(y)])
    ySquared = ySquared + 2 * y + 1;
    y += 1;
  }
  return arc;
}

function color32BitToRGB(val) {
  let rgb = Math.floor(val / 0x100);
  let r = Math.floor(rgb / 0x10000) % 0x100;
  let g = Math.floor(rgb / 0x100) % 0x100;
  let b = Math.floor(rgb / 0x1) % 0x100;
  return [r, g, b];
}

function color24BitToRGB(val) {
  let rgb = val;
  let r = Math.floor(rgb / 0x10000) % 0x100;
  let g = Math.floor(rgb / 0x100) % 0x100;
  let b = Math.floor(rgb / 1) % 0x100;
  return [r, g, b];
}

function isHalfwayValue(num) {
  let fract = num - Math.floor(num);
  return fract >= 0.25 && fract < 0.75;
}

function rgbToHSV(r, g, b) {
  let m = Math.max(r, g, b)
  let n = Math.min(r, g, b)
  let d = m - n
  let h = 0
  let s = (m == 0) ? 0 : (d / m)
  let v = m / 255
  if (m == r) {
    h = (g - b) + d * (g < b ? 6 : 0)
  } else if (m == g) {
    h = (b - r) + d * 2
  } else if (m == b) {
    h = (r - g) + d * 4
  }
  if (h != 0) {
    h = h / (6 * d)
  }
  return [h, s, v]
}

function sortByHSV(items) {
  for (let it of items) {
    if (!types.isRGBColor(it)) {
      throw new Error('sortByHSV got invalid item[${i}] must be RGBColor');
    }
  }
  // Build a list of colors, weighted by HSV
  let colors = [];
  for (let rgb of items) {
    let [h, s, v] = rgbToHSV(rgb.r, rgb.g, rgb.b);
    let k = Math.floor(h * 8) * 1000 + Math.floor(s * 64) + v;
    colors.push({key: k, rgb: rgb});
  }
  // Sort those colors
  colors.sort(function(a, b) {
    if (a.key < b.key) { return -1; }
    if (a.key > b.key) { return 1; }
    return 0;
  });

  // Convert back to just rgb values
  let build = [];
  for (let color of colors) {
    let rgb = color.rgb;
    build.push(rgb);
  }
  return build;
}

function flood(pl, initX, initY, color) {
  let top = pl.offsetTop || 0;
  let left = pl.offsetLeft || 0;
  let target = pl.data[(top+initY)*pl.pitch+(left+initX)];
  let queue = [{x:initX,y:initY}];
  let i = 0;
  while (queue.length > 0) {
    let node = queue.shift();
    // Inside?
    let value = pl.data[(top+node.y)*pl.pitch+(left+node.x)];
    if (value != target) {
      continue;
    }
    pl.data[(top+node.y)*pl.pitch+(left+node.x)] = color;
    // West
    if (node.x > 0) {
      queue.push({x:node.x-1, y:node.y});
    }
    // North
    if (node.y > 0) {
      queue.push({x:node.x, y:node.y-1});
    }
    // East
    if (node.x < pl.width - 1) {
      queue.push({x:node.x+1, y:node.y});
    }
    // South
    if (node.y < pl.height - 1) {
      queue.push({x:node.x, y:node.y+1});
    }
  }
}


function nearestNeighbor(input, scaleX, scaleY) {
  if (!types.isField(input)) {
    throw new Error(`input must be a Field`);
  }
  scaleY = scaleY || scaleX;

  let make = input.clone();
  make.clear();
  make.setSize(Math.floor(input.width*scaleX), Math.floor(input.height*scaleY));

  for (let y = 0; y < input.height; y++) {
    for (let x = 0; x < input.width; x++) {
      // Read value
      let c = input.get(x, y);
      for (let i = 0; i < scaleY; i++) {
        for (let j = 0; j < scaleX; j++) {
          // Write value
          make.put(x*scaleX+j, y*scaleY+i, c);
        }
      }
    }
  }
  return make;
}


function nearestNeighborSurface(input, zoomLevel) {
  if (!types.isSurface(input)) {
    throw new Error(`nearestNeighbor needs surface`);
  }

  // Allocate the surface scaled to its new size
  let make = makeSurface(input.width * zoomLevel, input.height * zoomLevel);
  for (let y = 0; y < input.height; y++) {
    for (let x = 0; x < input.width; x++) {
      // Read value
      let rgba = readRGBAColor(input, x, y);
      for (let i = 0; i < zoomLevel; i++) {
        for (let j = 0; j < zoomLevel; j++) {
          // Write value
          writeRGBAColor(make, x*zoomLevel+j, y*zoomLevel+i, rgba);
        }
      }
    }
  }
  return make;
}


function makeSurface(width, height) {
  width = Math.floor(width);
  height = Math.floor(height);
  let pitch = width * 4;
  let numBytes = pitch * height;
  let buff = new Uint8Array(numBytes);
  return {
    buff: buff,
    pitch: pitch,
    width: width,
    height: height,
  }
}


function mergeIntoSurface(dest, sour) {
  if (dest.width != sour.width) {
    throw new Error(`cannot merge incompatible layers, dest.width=${dest.width} <> source.width=${sour.width}`);
  }
  if (dest.height != sour.height) {
    throw new Error(`cannot merge incompatible layers, dest.height=${dest.height} <> source.height=${sour.height}`);
  }
  for (let y = 0; y < sour.height; y++) {
    for (let x = 0; x < sour.width; x++) {
      let k = y*sour.pitch + x*4;
      let r = sour.buff[k+0];
      let g = sour.buff[k+1];
      let b = sour.buff[k+2];
      let alpha = sour.buff[k+3];

      let j = y*dest.pitch + x*4;
      dest.buff[j+0] = _blend(dest.buff[j+0], sour.buff[k+0], alpha);
      dest.buff[j+1] = _blend(dest.buff[j+1], sour.buff[k+1], alpha);
      dest.buff[j+2] = _blend(dest.buff[j+2], sour.buff[k+2], alpha);
      dest.buff[j+3] = 0xff;
    }
  }
}


function _blend(mine, their, opacity) {
  let left = mine * (0xff - opacity);
  let rite = their * opacity;
  return Math.floor((left + rite) / 0xff);
}


function readRGBAColor(surface, x, y) {
  let k = y*surface.pitch + x*4;
  let r = surface.buff[k+0];
  let g = surface.buff[k+1];
  let b = surface.buff[k+2];
  let a = surface.buff[k+3];
  return [r, g, b, a];
}


function writeRGBAColor(surface, x, y, rgba) {
  let k = y*surface.pitch + x*4;
  surface.buff[k+0] = rgba[0];
  surface.buff[k+1] = rgba[1];
  surface.buff[k+2] = rgba[2];
  surface.buff[k+3] = rgba[3];
}


function renderLine(field, x0, y0, x1, y1, connectCorners) {
  if (!types.isInteger(x0) || !types.isInteger(y0) ||
      !types.isInteger(x1) || !types.isInteger(y1)) {
    return renderLineFloat(field, x0, y0, x1, y1);
  }

  // Integer based line drawing
  let put = [];
  let deltax = x1 - x0;
  let deltay = y1 - y0;

  if (Math.abs(deltay) <= Math.abs(deltax)) {

    if (deltax < 0) {
      [x0, x1] = [x1, x0];
      [y0, y1] = [y1, y0];
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

    let dist = 2 * Math.abs(deltay) - deltax;
    if (connectCorners) {
      dist = 2 * Math.abs(deltay) - 2 * deltax;
    }

    let y = y0;
    for (let x = x0; x <= x1; x++) {
      // Draw a pixel
      if (x >= 0 && x < field.width && y >= 0 && y < field.height) {
        put.push([x, y]);
      }

      if (dist > 0) {
        if (deltay > 0) {
          y = y + 1;
        } else if (deltay < 0) {
          y = y - 1;
        }
        dist = dist - 2*deltax;
      }
      dist = dist + 2*Math.abs(deltay);
    }
  } else {

    if (deltay < 0) {
      [x0, x1] = [x1, x0];
      [y0, y1] = [y1, y0];
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

    let dist = 2 * Math.abs(deltax) - deltay;
    if (connectCorners) {
      dist = 2 * Math.abs(deltax) - 2 * deltay;
    }
    let x = x0;
    for (let y = y0; y <= y1; y++) {
      // Draw a pixel
      if (x >= 0 && x < field.width && y >= 0 && y < field.height) {
        put.push([x, y]);
      }

      if (dist > 0) {
        if (deltax > 0) {
          x = x + 1;
        } else if (deltax < 0) {
          x = x - 1;
        }
        dist = dist - 2*deltay;
      }
      dist = dist + 2*Math.abs(deltax);
    }
  }

  return put;
}

function renderLineFloat(field, x0, y0, x1, y1) {
  let put = [];
  let deltax = x1 - x0;
  let deltay = y1 - y0;
  let slope = deltay / deltax;
  let positiveTorque = 1;

  if (Math.abs(deltay) <= Math.abs(deltax)) {
    // Always draw left to right. If backwards, swap the endpoints.
    if (deltax < 0) {
      [x0, x1] = [x1, x0];
      [y0, y1] = [y1, y0];
      deltax = -deltax;
      deltay = -deltay;
      positiveTorque = 0;
    }
    // Iterate each X pixel until we reach the endpoint.
    let midpoint, intercept;
    let limit = Math.ceil(x1);
    let x, y;
    x = Math.floor(x0);

    if (fract(x0) > 0.5) {
      x += 1;
    }
    if (fract(x1) > 0.0 && fract(x1) < 0.5) {
      limit -= 1;
    }

    for (; x < limit; x++) {
      midpoint = x + 0.5;
      intercept = (midpoint - x0) * slope + y0;
      y = Math.floor(intercept);
      if (fract(intercept) == 0.0 && !positiveTorque) {
        // Handle rounding depending on the torque of the line draw.
        y -= 1;
      }
      put.push([x, y]);
    }
  } else {
    if (deltay < 0) {
      [x0, x1] = [x1, x0];
      [y0, y1] = [y1, y0];
      deltax = -deltax;
      deltay = -deltay;
      positiveTorque = 0;
    }
    // Iterate each Y pixel until we reach the endpoint.
    let midpoint, intercept;
    let limit = Math.ceil(y1);
    let x, y;
    y = Math.floor(y0);

    if (fract(y0) > 0.5) {
      y += 1;
    }
    if (fract(y1) > 0.0 && fract(y1) < 0.5) {
      limit -= 1;
    }

    for (; y < limit; y++) {
      midpoint = y + 0.5;
      intercept = (midpoint - y0) / slope + x0;
      x = Math.floor(intercept);
      if (fract(intercept) == 0.0 && !positiveTorque) {
        // Handle rounding depending on the torque of the line draw.
        x -= 1;
      }
      put.push([x, y]);
    }
  }

  return put;
}

function fract(n) {
  return n - Math.floor(n);
}

function renderPolygon(field, baseX, baseY, inPoints, fill) {
  let isPixelPoly = types.isInteger(baseX) && types.isInteger(baseY);
  let points = [];
  for (let p of inPoints) {
    if (!types.isInteger(p[0]) || !types.isInteger(p[1])) {
      isPixelPoly = false;
    }
    points.push({x: p[0] + baseX, y: p[1] + baseY});
  }
  if (fill) {
    return renderPolygonFill(field, points, isPixelPoly);
  } else {
    return renderPolygonOutline(field, points, isPixelPoly);
  }
}

function asFloats(points) {
  let result = [];
  for (let p of points) {
    result.push({x: p.x + 0.5000001, y: p.y + 0.5000001});
  }
  return result;
}

function renderPolygonFill(field, inPoints, isPixelPoly) {
  let put = [];
  let edgeX = [];
  let edgeDir = [];
  let pixelX, pixelY;
  let i, j;
  let lineSegYi, lineSegYj, lineSegXi, lineSegXj;

  let points;
  if (isPixelPoly) {
    points = asFloats(inPoints);
  } else {
    points = inPoints;
  }

  let imageTop, imageBottom;
  let imageLeft, imageRight;
  imageTop = points[0].y;
  imageBottom = points[0].y;
  imageLeft = points[0].x;
  imageRight = points[0].x;

  // Find polygon's top and bottom.
  for (let p of points) {
    if (p.x < imageLeft) {
      imageLeft = p.x;
    }
    if (p.x > imageRight) {
      imageRight = p.x;
    }
    if (p.y < imageTop) {
      imageTop = p.y;
    }
    if (p.y > imageBottom) {
      imageBottom = p.y;
    }
  }

  let y0 = Math.floor(imageTop);
  let y1 = Math.floor(imageBottom);
  if (y0 < 0) {
    y0 = 0;
  }
  if (y1 >= field.height) {
    y1 = field.height - 1;
  }

  //  Loop through the rows of the image.
  for (pixelY = Math.floor(imageTop); pixelY <= imageBottom; pixelY++) {
    let scanlineY = pixelY + 0.5;

    edgeX = [];
    edgeDir = [];

    // Build a list of edges
    for (i = 0; i < points.length; i++) {
      if (i > 0) {
        j = i - 1;
      } else {
        j = points.length - 1;
      }
      lineSegXi = points[i].x;
      lineSegXj = points[j].x;
      lineSegYi = points[i].y;
      lineSegYj = points[j].y;

      // If the current scanline's Y position overlaps the line segment.
      if ((lineSegYi <= scanlineY && lineSegYj >= scanlineY) ||
          (lineSegYj <= scanlineY && lineSegYi >= scanlineY)) {

        if (lineSegYi == lineSegYj) {
          continue;
        }

        // Calculate where the edge intersects the scanline.
        let deltaX = lineSegXj - lineSegXi;
        let deltaY = lineSegYj - lineSegYi;
        let slope = (scanlineY-lineSegYi)/deltaY*deltaX;
        let intersect = Math.floor(lineSegXi + slope);
        let lineDirY = deltaY >= 0 ? 1 : -1;

        // If edge is already intersecting this pixel, and this edge
        // is going in the same direction, skip adding it.
        if (edgeX.length > 0) {
          let last = edgeX.length - 1;
          if (edgeX[last] == intersect && edgeDir[last] == lineDirY) {
            continue;
          }
          if (edgeX[0] == intersect && edgeDir[0] == lineDirY) {
            continue;
          }
        }

        // Add the edge intersection.
        edgeX.push(intersect);
        edgeDir.push(lineDirY);
      }
    }

    // Sort the edges, via a simple bubble sort.
    if (edgeX.length > 0) {
      i = 0;
      while (i < edgeX.length - 1) {
        if (edgeX[i] > edgeX[i+1]) {
          let tmp = edgeX[i];
          edgeX[i] = edgeX[i+1];
          edgeX[i+1] = tmp;
          if (i) {
            i--;
          }
        } else {
          i++;
        }
      }
    }

    // Fill the pixels between the edges.
    for (i = 0; i < edgeX.length; i += 2) {
      let x0 = Math.floor(edgeX[i]);
      let x1 = Math.floor(edgeX[i+1]);
      if (x0 < 0) {
        x0 = 0;
      }
      if (x1 >= field.width) {
        x1 = field.width - 1;
      }
      let y = Math.floor(pixelY);
      put.push([x0, x1, y, y]);
    }
  }

  // TODO: Handle fractional edges such that this call isn't needed.
  let res = renderPolygonOutline(field, inPoints);
  put = put.concat(res);
  return put;
}

function renderPolygonOutline(field, points) {
  let put = [];
  let i, j;

  for (i = 0; i < points.length; i++) {
    if (i > 0) {
      j = i - 1;
    } else {
      j = points.length - 1;
    }
    let p = points[i];
    let q = points[j];
    let res = renderLine(field, p.x, p.y, q.x, q.y, false);
    put = put.concat(res);
  }

  return put;
}

function renderCircle(x, y, points, inner, fill, half) {
  let put = [];

  // Num points will always be assigned, but num inner is optional.
  let numInner = inner ? inner.length : -1;

  for (let i = 0; i < points.length; i++) {
    let pair = points[i];

    // The circle is defined by an arc that represents one octant of the
    // full circle. This arc is a list of int pairs. One is called the stretch
    // and begins equal to the radius, then moves occassional back towards
    // the origin as it moves around the circumfrence. The other is called
    // the cross, and moves laterally away from the origin, monotonically at
    // end step.
    //
    // For example:
    //
    //           arc
    //            |
    //            v
    //           \    ^
    //            |   |
    //             \  | <- cross
    //              | |
    //              | |
    // ------------->
    //        ^
    //        |
    //     stretch
    //
    // In this case, the total stretch = 13, and the total cross = 5.
    // The arc is this list of ints: [[13,0],[13,1],[12,2],[12,3],[11,4]]

    let stretch = pair[0];
    let cross = pair[1];

    let limit = -1;
    if (i < numInner) {
      // If inner list exists, and we're inside it, get the Left value.
      pair = inner[i];
      limit = pair[0];
    } else if (numInner != -1) {
      // If inner list exists, and we're past it, Left is the diagonal border.
      limit = cross - 2;
    }

    // Handle the difference between far values (those going in a positive
    // direction), and near values (those going in a negative direction),
    // when the circle radius is at a halfway value. This is needed in order
    // to give the circle the proper width.
    let adjustFar = 0;
    if (!half) {
      adjustFar = 1;
    }
    // Far stretch, near stretch, far cross, and near cross.
    let fars = stretch - adjustFar;
    let nears = -stretch;
    let farc = cross - adjustFar;
    let nearc = -cross;

    // Far limit, and near limit.
    let farl = 0;
    let nearl = 0;
    if (fill) {
      // When filling the circle, put the range completely to the origin.
      farl = 0;
      nearl = 0;
    } else if (limit == -1) {
      // If no width given, set a width of 1
      farl = stretch - adjustFar;
      nearl = -stretch;
    } else {
      // If a width was given, use a range limit.
      farl = limit - adjustFar;
      nearl = -limit;
    }

    // Call putRange, and draw the appropriate mirrored octant of the arc
    // in order to draw the complete the circle. Numbered as follows:
    //
    //            2    |    1
    //             \   |   /
    //              |  |  |
    //               \ | /
    //   3 ____      | | |      ____ 0
    //         \----  \|/  ----/
    //              \--|--/
    // -----------------------------------
    //               --|--
    //          ----/ /|\ \----
    //     ____/      |||      \____ 7
    //   4           / | \
    //              |  |  |
    //             /   |   \
    //            5    |    6

    put.push([x + fars,  x + farl,  y + nearc, y + nearc]); // 0
    put.push([x + fars,  x + farl,  y + farc , y + farc ]); // 7
    put.push([x + nears, x + nearl, y + nearc, y + nearc]); // 3
    put.push([x + nears, x + nearl, y + farc , y + farc ]); // 4

    // The octants with x-crosses and y-stretchs
    put.push([x + farc,  x + farc,  y + nears, y + nearl]); // 1
    put.push([x + nearc, x + nearc, y + nears, y + nearl]); // 2
    put.push([x + farc,  x + farc,  y + fars,  y + farl ]); // 6
    put.push([x + nearc, x + nearc, y + fars,  y + farl ]); // 5
  }
  return put;
}

module.exports.renderPolygon = renderPolygon;
module.exports.renderLine = renderLine;
module.exports.renderCircle = renderCircle;
module.exports.midpointCircleRasterize = midpointCircleRasterize;
module.exports.sortByHSV = sortByHSV;
module.exports.isHalfwayValue = isHalfwayValue;
module.exports.flood = flood;
module.exports.nearestNeighbor = nearestNeighbor;
module.exports.nearestNeighborSurface = nearestNeighborSurface;
module.exports.makeSurface = makeSurface;
module.exports.mergeIntoSurface = mergeIntoSurface;
module.exports.rgbToHSV = rgbToHSV;
