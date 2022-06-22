const types = require('./types.js');

class RGBColor {
  constructor(val) {
    if (val === undefined || val === null) {
      this.r = this.g = this.b = 0;
      return this;
    }

    if (arguments.length == 3 && arguments[2] !== undefined) {
      val = [arguments[0], arguments[1], arguments[2]];
    }

    // if int, treat it as 24-bit rgb value
    if (types.isNumber(val)) {
      this.r = Math.floor(val / 0x10000) % 0x100;
      this.g = Math.floor(val / 0x100)   % 0x100;
      this.b = Math.floor(val / 0x1)     % 0x100;
      return this;
    }

    // if string, treat it as a html style hex value
    if (types.isString(val)) {
      if (val[0] == '#') {
        this.r = parseInt(val.slice(1, 3), 16)
        this.g = parseInt(val.slice(3, 5), 16)
        this.b = parseInt(val.slice(5, 7), 16)
        return this;
      }
      throw `could not convert to RGB: ${val}`
    }

    // if list, treat it as a 3 tuple
    if (types.isArray(val)) {
      if (val.length == 3) {
        this.r = val[0];
        this.g = val[1];
        this.b = val[2];
        this._ensureOk();
        return this;
      }
      throw `could not convert to RGB: ${val}`
    }

    // if object, treat as a r,g,b struct
    if (types.isObject(val)) {
      this.r = val.r;
      this.g = val.g;
      this.b = val.b;
      return this;
    }

    if (types.isRGBColor(val)) {
      this.r = val.r;
      this.g = val.g;
      this.b = val.b;
      return this;
    }

    throw `could not convert to RGB: ${val}`
  }

  copy() {
    let res = new RGBColor();
    res.r = this.r;
    res.g = this.g;
    res.b = this.b;
    return res;
  }

  equals(other) {
    if (other.constructor !== RGBColor) {
      throw new Error('RGBColor.equals can only compare to RGBColor');
    }
    return (this.r == other.r && this.g == other.g && this.b == other.b);
  }

  interpolate(other, val, inp) {
    if (inp === undefined || inp.min === undefined || !inp.max) {
      throw 'interpolate needs range like {min: min, max: max}';
    }
    let min = inp.min;
    let max = inp.max;

    if (max < min) {
      return new RGBColor();
    }
    if (val <= min) {
      return this.copy();
    }
    if (val >= max) {
      return other.copy();
    }

    let res = new RGBColor();

    let range = max - min;
    let dist = val - min;

    let weightRite = dist / range;
    let weightLeft = 1.0 - (dist / range);

    res.r = Math.round(this.r * weightLeft + other.r * weightRite);
    res.g = Math.round(this.g * weightLeft + other.g * weightRite);
    res.b = Math.round(this.b * weightLeft + other.b * weightRite);

    return res;
  }

  toInt() {
    this._ensureOk();
    return this.r * 0x10000 + this.g * 0x100 + this.b;
  }

  toHexStr() {
    this._ensureOk();

    let rtxt = this.r.toString(16);
    let gtxt = this.g.toString(16);
    let btxt = this.b.toString(16);
    while (rtxt.length < 2) {
      rtxt = '0' + rtxt;
    }
    while (gtxt.length < 2) {
      gtxt = '0' + gtxt;
    }
    while (btxt.length < 2) {
      btxt = '0' + btxt;
    }
    return `#${rtxt}${gtxt}${btxt}`;
  }

  toString() {
    return 'RGBColor{' + this.toHexStr() + '}';
  }

  _ensureOk() {
    if (this.r > 255 || this.g > 255 || this.b > 255) {
      throw new Error(`rgb value too large ${this.r} ${this.g} ${this.b}`);
    }
    if (this.r === undefined ||
        this.g === undefined ||
        this.b === undefined) {
      throw new Error(`rgb value not properly defined ${this.r} ${this.g} ${this.b}`);
    }
  }

}


function ensureIs(rgb) {
  if (rgb == null) {
    throw new Error(`rgb value invalid, is null`);
  }
  if (rgb.constructor !== RGBColor) {
    throw new Error(`rgb value invalid, is ${rgb}`);
  }
}

var BLACK = new RGBColor();

module.exports.RGBColor = RGBColor;
module.exports.BLACK = BLACK;
module.exports.ensureIs = ensureIs;
