const types = require('./types.js');

class Polygon {
  constructor(points, centerAxis) {
    centerAxis = _toPoint(centerAxis);
    this._points = points;
    centerAxis = centerAxis || guessCenterOf(this._points);
    this._centerX = centerAxis.x;
    this._centerY = centerAxis.y;
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
    for (let p of this._points) {
      var x = p[0];
      var y = p[1];
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

function _toPoint(source) {
  let x, y;
  if (source == null) {
    return source;
  }
  if (arguments.length == 2) {
    x = arguments[0];
    y = arguments[1];
    return {x: x, y: y};
  }
  if (source.length == 2) {
    x = source[0];
    y = source[1];
    return {x: x, y: y};
  }
  if (source.x != null && source.y != null) {
    x = source.x;
    y = source.y;
    return {x: x, y: y};
  }
  throw new Error(`cannot construct point from ${source}`);
}

function convertToPolygon(pointsOrPolygon, center) {
  // If already a polygon, just return it.
  if (pointsOrPolygon instanceof Polygon) {
    return pointsOrPolygon;
  }
  // If a list of points, figure out if it is pixel-positioned.
  let points = pointsOrPolygon;
  var isPixelPolygon = true;
  for (let p of points) {
    if (!types.isInteger(p[0]) && !types.isInteger(p[0])) {
      isPixelPolygon = false;
      break;
    }
  }
  // If pixel-positioned, convert to float-positioned.
  if (isPixelPolygon) {
    for (let p of points) {
      p[0] += 0.50000001;
      p[1] += 0.50000001;
    }
  }
  return new Polygon(points, center)
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
  for (let p of points) {
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
  return _toPoint((left+right)/2, (top+bot)/2);
}

module.exports.Polygon = Polygon;
module.exports.convertToPolygon = convertToPolygon;
module.exports.convertToPoints = convertToPoints;
