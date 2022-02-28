const ra = require('raster');

// Setup, declare some colors, and clear the plane
ra.setSize(80, 40);
ra.setZoom(8);
const [BACK_COLOR, FRONT_COLOR, SHADE_COLOR] = [45, 38, 30];
ra.fillColor(BACK_COLOR);

// Draw the drop shadow and the foreground text
for (let j = 0; j < 2; j++) {
  // They use different colors
  ra.setColor([SHADE_COLOR, FRONT_COLOR][j]);
  // Select part of the plane to draw to
  let sel = ra.select({x:4, y:6-j, w:76, h:32});
  // Two vertical lines and a circle
  for (let offs = 0; offs < 39; offs += 38) {
    sel.fillRect({x:offs, y:0, w:4, h:24});
    sel.fillRect({x:10+offs, y:0, w:4, h:24});
    sel.drawCircle({x:18+offs, y:8, r:8, width:4});
  }
  // Some horizontal lines on the left-hand half
  sel.fillRect({x: 0, y:10, w:12, h:4});
  sel.fillRect({x:20, y:14, w:12, h:3});
}
// Blit in some pixels to patch up the 'e'
let sel = ra.select({x:32, y:21, w:6, h:4});
sel.fillPattern([[FRONT_COLOR], [SHADE_COLOR], [BACK_COLOR]]);

// Create raster bars using nice pastel colors
let [bgColor, step] = [ra.usePalette()[BACK_COLOR], 0];
let interrupts = [
  {scanline: 0,       irq:()=>{ bgColor.setColor(BACK_COLOR) }},
  {scanline: [34,40], irq:(ln)=>{ bgColor.setColor((step+ln)%8+56) }},
]
ra.useInterrupts(interrupts);

// Bounce the text by changing the Y scroll very slowly
ra.run(function() {
  step = ra.timeClick / 8;
  ra.setScrollY(ra.oscil({period: 240, amp: 10}) - 6);
});
