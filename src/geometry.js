function rotatePolygon(polygon, angle) {
  var axis = centerOf(polygon);

  var isPixelPolygon = true;

  for (var i = 0; i < polygon.length; i++) {
    if (!isInt(polygon[i][0]) && !isInt(polygon[i][0])) {
      isPixelPolygon = false;
      break;
    }
  }

  if (isPixelPolygon) {
    for (var i = 0; i < polygon.length; i++) {
      polygon[i][0] += 0.50000001;
      polygon[i][1] += 0.50000001;
    }
  }

  for (var i = 0; i < polygon.length; i++) {
    var x = polygon[i][0];
    var y = polygon[i][1];
    x = x - axis[0];
    y = y - axis[1];

    var rot_x = x * Math.cos(angle) - y * Math.sin(angle);
    var rot_y = x * Math.sin(angle) + y * Math.cos(angle);

    polygon[i][0] = rot_x + axis[0];
    polygon[i][1] = rot_y + axis[1];
  }
}

function centerOf(polygon) {
  var left  = polygon[0][0];
  var top   = polygon[0][1];
  var right = polygon[0][0];
  var bot   = polygon[0][1];
  for (var i = 1; i < polygon.length; i++) {
    var p = polygon[i];
    if (p[0] < left) {
      left = p[0];
    }
    if (p[0] > right) {
      right = p[0];
    }
    if (p[1] < top) {
      top = p[1];
    }
    if (p[1] > bot) {
      bot = p[1];
    }
  }
  return [(left+right)/2, (top+bot)/2];
}

function isInt(n) {
  let fract = n - Math.floor(n);
  return fract == 0.0;
}

module.exports.rotatePolygon = rotatePolygon;
