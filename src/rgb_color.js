function RGBColor(val) {
  if (val === undefined || val === null) {
    this.r = this.g = this.b = 0;
    return this;
  }

  // if int, treat it as 24-bit rgb value
  if (typeof val == 'number') {
    this.r = Math.floor(val / 0x10000) % 0x100;
    this.g = Math.floor(val / 0x100)   % 0x100;
    this.b = Math.floor(val / 0x1)     % 0x100;
    return this;
  }

  // if string, treat it as a html style hex value
  if (typeof val == 'string') {
    if (val[0] == '#') {
      this.r = parseInt(val.slice(1, 3), 16)
      this.g = parseInt(val.slice(3, 5), 16)
      this.b = parseInt(val.slice(5, 7), 16)
      return this;
    }
    throw `could not convert to RGB: ${val}`
  }

  // if list, treat it as a 3 tuple
  if (val.constructor.name == 'Array') {
    if (val.length == 3) {
      this.r = val[0];
      this.g = val[1];
      this.b = val[2];
      return this;
    }
    throw `could not convert to RGB: ${val}`
  }

  // if object, treat as a r,g,b struct
  if (val.constructor.name == 'Object') {
    this.r = val.r;
    this.g = val.g;
    this.b = val.b;
    return this;
  }

  if (val.constructor == RGBColor) {
    this.r = val.r;
    this.g = val.g;
    this.b = val.b;
    return this;
  }

  throw `could not convert to RGB: ${val}`
}

RGBColor.prototype.copy = function() {
  let res = new RGBColor();
  res.r = this.r;
  res.g = this.g;
  res.b = this.b;
  return res;
}

RGBColor.prototype.interpolate = function(other, val, inp) {
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

RGBColor.prototype.toInt = function() {
  return this.r * 0x10000 + this.g * 0x100 + this.b;
}

RGBColor.prototype.toHexStr = function() {
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

RGBColor.prototype.toString = function() {
  return 'RGBColor{' + this.toHexStr() + '}';
}

module.exports.RGBColor = RGBColor;
