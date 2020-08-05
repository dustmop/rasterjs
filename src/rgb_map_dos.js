const rgb_mapping = [
  0x000000, // 0 block
  0x0000aa, // 1 blue
  0x00aa00, // 2 green
  0x00aaaa, // 3 cyan
  0xaa0000, // 4 red
  0xaa00aa, // 5 purple
  0xaa5500, // 6 brown
  0xaaaaaa, // 7 grey
  0x555555, // 8 light grey
  0x5555ff, // 9 light blue
  0x55ff55, // a light green
  0x55ffff, // b light cyan
  0xff5555, // c light red
  0xff55ff, // d light purple
  0xffff55, // e light yellow
  0xffffff, // f white
];

if (typeof module !== 'undefined') {
  module.exports.rgb_mapping = rgb_mapping;
}
