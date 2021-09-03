var assert = require('assert');
var rgbColor = require('../src/rgb_color.js');

describe('RGBColor', function() {
  it('empty', function() {
    let color = new rgbColor.RGBColor();
    assert.equal(color.r, 0);
    assert.equal(color.g, 0);
    assert.equal(color.b, 0);
  });

  it('from 24-bit int', function() {
    let color = new rgbColor.RGBColor(0xf08040);
    assert.equal(color.r, 0xf0);
    assert.equal(color.g, 0x80);
    assert.equal(color.b, 0x40);
  });

  it('from html hex string', function() {
    let color = new rgbColor.RGBColor('#f08040');
    assert.equal(color.r, 0xf0);
    assert.equal(color.g, 0x80);
    assert.equal(color.b, 0x40);
  });

  it('from 3 element list', function() {
    let color = new rgbColor.RGBColor([0xf0, 0x80, 0x40]);
    assert.equal(color.r, 0xf0);
    assert.equal(color.g, 0x80);
    assert.equal(color.b, 0x40);
  });

  it('from literal object', function() {
    let color = new rgbColor.RGBColor({r: 0xf0, g: 0x80, b: 0x40});
    assert.equal(color.r, 0xf0);
    assert.equal(color.g, 0x80);
    assert.equal(color.b, 0x40);
  });

  it('interpolate', function() {
    let left = new rgbColor.RGBColor(0x400040);
    let rite = new rgbColor.RGBColor(0xff0080);
    let ans = left.interpolate(rite, 20, {min: 10, max: 50});
    assert.equal('#700050', ans.toHexStr());
    assert.equal(0x700050, ans.toInt());

    left = new rgbColor.RGBColor(0x80107e);
    rite = new rgbColor.RGBColor(0x206072);
    ans = left.interpolate(rite, 58, {min: 32, max: 64});
    assert.equal('#325174', ans.toHexStr());
    assert.equal(0x325174, ans.toInt());
  });

});
