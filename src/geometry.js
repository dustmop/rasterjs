const types = require('./types.js');

class Polygon {
  constructor(points, centerAxis) {
    this._points = points;
    centerAxis = centerAxis || guessCenterOf(this._points);
    this._centerX = centerAxis[0];
    this._centerY = centerAxis[1];
    return this;
  }

  points() {
    return this._points;
  }

  center() {
    return [this._centerX, this._centerY];
  }

  rotate(angle) {
    let result = [];
    for (var i = 0; i < this._points.length; i++) {
      var x = this._points[i][0];
      var y = this._points[i][1];
      // Translate to the origin.
      x = x - this._centerX;
      y = y - this._centerY;
      // Rotate the points around the origin.
      var rot_x = x * Math.cos(angle) - y * Math.sin(angle);
      var rot_y = x * Math.sin(angle) + y * Math.cos(angle);
      // Translate back to the original grid system, and add.
      result.push([rot_x + this._centerX, rot_y + this._centerY]);
    }
    this._points = result;
  }
}

function convertToPolygon(pointsOrPolygon) {
  // If already a polygon, just return it.
  if (pointsOrPolygon instanceof Polygon) {
    return pointsOrPolygon;
  }
  // If a list of points, figure out if it is pixel-positioned.
  let points = pointsOrPolygon;
  var isPixelPolygon = true;
  for (let i = 0; i < points.length; i++) {
    if (!types.isInteger(points[i][0]) && !types.isInteger(points[i][0])) {
      isPixelPolygon = false;
      break;
    }
  }
  // If pixel-positioned, convert to float-positioned.
  if (isPixelPolygon) {
    for (let i = 0; i < points.length; i++) {
      points[i][0] += 0.50000001;
      points[i][1] += 0.50000001;
    }
  }
  return new Polygon(points)
}

function convertToPoints(pointsOrPolygon) {
  if (pointsOrPolygon instanceof Polygon) {
    return pointsOrPolygon.points();
  }
  return pointsOrPolygon;
}

function guessCenterOf(points) {
  var left  = points[0][0];
  var top   = points[0][1];
  var right = points[0][0];
  var bot   = points[0][1];
  for (var i = 1; i < points.length; i++) {
    var p = points[i];
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

module.exports.Polygon = Polygon;
module.exports.convertToPolygon = convertToPolygon;
module.exports.convertToPoints = convertToPoints;
