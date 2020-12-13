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

module.exports.midpointCircleRasterize = midpointCircleRasterize;
