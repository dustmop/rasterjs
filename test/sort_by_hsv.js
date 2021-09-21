var assert = require('assert');
var algorithm = require('../src/algorithm.js');
var rgbColor = require('../src/rgb_color.js');

describe('HSV sort', function() {
  it('default', function() {
    let vals = [
0xd0a040,
0xc08020,
0xd8c030,
0x60c080,
0xe040a0,
0x40d020,
0x204070,
0xb08840,
    ];
    let rgbItems = [];
    for (let i = 0; i < 8; i++) {
      rgbItems.push(new rgbColor.RGBColor(vals[i]));
    }
    rgbItems = algorithm.sortByHSV(rgbItems);
    let actual = rgbItems.toString();
    let expect = 'RGBColor{#b08840},RGBColor{#c08020},RGBColor{#d0a040},RGBColor{#d8c030},RGBColor{#60c080},RGBColor{#40d020},RGBColor{#204070},RGBColor{#e040a0}';
    assert.equal(expect, actual);
  });
});
