const rgb_map_default = [
  0x000000,0x202020,0x404040,0x606060,0x808080,0xa0a0a0,0xc0c0c0,0xffffff,
  0x331414,0x332414,0x303314,0x1c3314,0x143325,0x142833,0x1e1433,0x33142a,
  0x661919,0x664019,0x5e6619,0x2b6619,0x196642,0x194a66,0x301966,0x66194f,
  0xbf2626,0xbf7326,0xb0bf26,0x4abf26,0x26bf78,0x2687bf,0x5426bf,0xbf2691,
  0xff3333,0xff9933,0xebff33,0x63ff33,0x33ffa0,0x33b4ff,0x7033ff,0xff33c2,
  0xff7373,0xffb973,0xf1ff73,0x93ff73,0x73ffbe,0x73ccff,0x9d73ff,0xff73d5,
  0xffa6a6,0xffd2a6,0xf6ffa6,0xbbffa6,0xa6ffd5,0xa6deff,0xc1a6ff,0xffa6e4,
  0xffd9d9,0xffecd9,0xfbffd9,0xe2ffd9,0xd9ffed,0xd9f1ff,0xe4d9ff,0xffd9f4,
];

const rgb_map_dos = [
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

const rgb_map_nes = [
//-------------------------------------------------------------------------
//  grey 00  blue 01  blue 02 purple03 purple04   red 05   red 06   red 07
   0x7c7c7c,0x0000fc,0x0000bc,0x4428bc,0x940084,0xa80020,0xa81000,0x881400,
// brown 08 green 09 green 0a green 0b  cyan 0c black 0d black 0e black 0f
   0x503000,0x007800,0x006800,0x005800,0x004058,0x080808,0x080808,0x000000,
//-------------------------------------------------------------------------
//  grey 10  blue 11  blue 12 purple13 purple14   red 15   red 16 orange17
   0xbcbcbc,0x0078f8,0x0058f8,0x6844fc,0xd800cc,0xe40058,0xf83800,0xe45c10,
// brown 18 green 19 green 1a green 1b  cyan 1c  grey 1d black 1e black 1f
   0xac7c00,0x00b800,0x00a800,0x00a844,0x008888,0x080808,0x080808,0x080808,
//-------------------------------------------------------------------------
// white 20  blue 21  blue 22 purple23  pink 24  pink 25 orange26 orange27
   0xf8f8f8,0x3cbcfc,0x6888fc,0x9878f8,0xf878f8,0xf85898,0xf87858,0xfca044,
// orange28 green 29 green 2a green 2b  cyan 2c  grey 2d black 2e black 2f
   0xf8b800,0xb8f818,0x58d854,0x58f898,0x00e8d8,0x787878,0x080808,0x080808,
//-------------------------------------------------------------------------
// white 30  blue 31  blue 32 purple33  pink 34  pink 35 peach 36 peach 37
   0xfcfcfc,0xa4e4fc,0xb8b8f8,0xd8b8f8,0xf8b8f8,0xf8a4c0,0xf0d0b0,0xfce0a8,
// peach 38 yellow39 green 3a green 3b  cyan 3c  grey 3d black 3e black 3f
   0xf8d878,0xd8f878,0xb8f8b8,0xb8f8d8,0x00fcfc,0xf8d8f8,0x080808,0x080808
];

const rgb_map_gameboy = [
  0x003f00,
  0x2e7320,
  0x8cbf0a,
  0xa0cf0a,
];

const rgb_map_pico8 = [
  0x000000,
  0x1d2b53,
  0x7e2553,
  0x008751,
  0xab5236,
  0x5f574f,
  0xc2c3c7,
  0xfff1e8,
  0xff004d,
  0xffa300,
  0xffec27,
  0x00e436,
  0x29adff,
  0x83769c,
  0xff77a8,
  0xffccaa,
];

const rgb_map_zx_spectrum = [
  0x000000,
  0x0000d7, // basic blue
  0xd70000, // basic red
  0xd700d7, // basic magenta
  0x00d700, // basic green
  0x00d7d7, // basic cyan
  0xd7d700, // basic yellow
  0xd7d7d7, // basic white
  0x000000,
  0x0000ff, // bright blue
  0xff0000, // bright red
  0xff00ff, // bright magenta
  0x00ff00, // bright green
  0x00ffff, // bright cyan
  0xffff00, // bright yellow
  0xffffff, // bright white
];

const rgb_map_c64 = [
  0x000000,
  0xffffff,
  0x880000,
  0xaaffee,
  0xcc44cc,
  0x00cc55,
  0x0000aa,
  0xeeee77,
  0xdd8855,
  0x664400,
  0xff7777,
  0x333333,
  0x777777,
  0xaaff66,
  0x0088ff,
  0xbbbbbb,
];

const rgb_map_grey = function() {
  let colors = [];
  for (let k = 0; k < 0x100; k++) {
    let c = k * 0x10000 + k * 0x100 + k;
    colors.push(c);
  }
  return colors;
}();

module.exports.rgb_map_default = rgb_map_default;
module.exports.rgb_map_nes     = rgb_map_nes;
module.exports.rgb_map_dos     = rgb_map_dos;
module.exports.rgb_map_grey    = rgb_map_grey;
module.exports.rgb_map_gameboy = rgb_map_gameboy;
module.exports.rgb_map_pico8   = rgb_map_pico8;
module.exports.rgb_map_zx_spectrum = rgb_map_zx_spectrum;
module.exports.rgb_map_c64     = rgb_map_c64;
