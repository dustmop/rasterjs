function midpointCircleRasterize(r) {
  let arc = new Array();
  let y = 0;
  let x = r;
  let rSquared = r * r;
  let xSquared = rSquared;
  let ySquared = 0 * 0;
  // Loop increments Y each step, and decrements X occasionally, based upon
  // error accumulation. Eventually X==Y, which breaks the loop.
  while (true) {
    // Invariant: x * x == xSquared && y * y == ySquared
    let answer = rSquared - ySquared;
    let err = xSquared - answer;
    if (err >= x) {
      xSquared = xSquared - 2 * x + 1;
      x -= 1;
    }
    if (x < y) {
      break;
    }
    arc.push([x, y])
    ySquared = ySquared + 2 * y + 1;
    y += 1;
  }
  return arc;
}

function color32BitToRGB(val) {
  let rgb = Math.floor(val / 0x100);
  let r = Math.floor(rgb / 0x10000);
  let g = Math.floor(rgb / 0x100) % 0x100;
  let b = rgb % 0x100;
  return [r, g, b];
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

function sortByHSV(image) {
  let colors = [];
  // Get first element, treat as the background color, skip it in the loop
  let bgColor = Math.floor(image.palette[0]);
  for (let i = 1; i < image.palette.length; i++) {
    let [r, g, b] = color32BitToRGB(image.palette[i]);
    let [h, s, v] = rgbToHSV(r, g, b);
    let k = Math.floor(h * 10) * 10000 + Math.floor(v * 1000) + s;
    colors.push([k, r, g, b, h, s, v, i]);
  }
  colors.sort(function(a, b) {
    if (a[0] < b[0]) { return -1; }
    if (a[0] > b[0]) { return 1; }
    return 0;
  });

  if (false) {
    // Debugging
    for (let i = 0; i < colors.length; i++) {
      let c = colors[i];
      console.log(`${i+1}: key=${c[0]} r=${c[1]} g=${c[2]} b=${c[3]}`);
    }
  }

  let remap = {};
  let palette = [];
  // Put the bgColor at the front
  palette.push(bgColor);
  for (let i = 0; i < colors.length; i++) {
    let from = colors[i][7];
    // Add 1 because we start with the bgColor in position 0
    remap[from] = i+1;
    let r = colors[i][1];
    let g = colors[i][2];
    let b = colors[i][3];
    palette.push((r * 0x10000 + g * 0x100 + b) * 0x100 + 0xff);
  }

  // Fix up the buffer values
  for (let i = 0; i < image.buffer.length; i++) {
    image.buffer[i] = remap[image.buffer[i]];
  }
  image.palette = palette;
}

module.exports.midpointCircleRasterize = midpointCircleRasterize;
module.exports.sortByHSV = sortByHSV;
