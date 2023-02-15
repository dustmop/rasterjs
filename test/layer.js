var util = require('./util.js');
var ra = require('../src/lib.js');

describe('Layers', function() {
  it('two layers', function() {
    ra.resetState();
    ra.setZoom(2);

    let upper = new ra.Plane();
    upper.setSize(16, 16);

    let lower = new ra.Plane();
    lower.setSize(16, 16);

    ra.setSize(16, 16);
    ra.usePlane([lower, upper]);

    // Draw upper plane, dirt on ground.
    upper.fillColor(0);
    upper.setColor(33);
    upper.fillRect({x: 0, y: 11, w: 16, h: 5});
    upper.setColor(17);
    upper.drawLine({x0: 0, y0: 11, x1: 16, y1: 11});
    upper.setColor(25);
    upper.drawLine({x0: 0, y0: 12, x1: 16, y1: 12});
    upper.setColor(9);
    upper.drawDot({x: 1, y: 14});
    upper.drawDot({x: 5, y: 15});
    upper.drawDot({x: 8, y: 13});
    upper.drawDot({x:12, y: 15});

    // Draw lower plane, the sun.
    lower.fillColor(32);
    lower.setColor(42);
    lower.fillCircle({x: 2, y: 2, r: 6});

    util.renderCompareTo(ra, 'test/testdata/sunset_layers.png');
  });

  it('bottom layer can scroll', function() {
    ra.resetState();
    ra.setZoom(2);

    let upper = new ra.Plane();
    upper.setSize(16, 16);

    let lower = new ra.Plane();
    lower.setSize(16, 16);

    ra.setSize(16, 16);
    ra.usePlane([lower, upper]);

    // Draw upper plane, dirt on ground.
    upper.fillColor(0);
    upper.setColor(33);
    upper.fillRect({x: 0, y: 11, w: 16, h: 5});
    upper.setColor(17);
    upper.drawLine({x0: 0, y0: 11, x1: 16, y1: 11});
    upper.setColor(25);
    upper.drawLine({x0: 0, y0: 12, x1: 16, y1: 12});
    upper.setColor(9);
    upper.drawDot({x: 1, y: 14});
    upper.drawDot({x: 5, y: 15});
    upper.drawDot({x: 8, y: 13});
    upper.drawDot({x:12, y: 15});

    // Draw lower plane, the sun.
    lower.fillColor(32);
    lower.setColor(42);
    lower.fillCircle({x: 2, y: 2, r: 6});

    ra.setScrollX(4);
    ra.setScrollY(6);

    util.renderCompareTo(ra, 'test/testdata/sunset_scroll_bottom.png');
  });

  it('top layer can scroll', function() {
    ra.resetState();
    ra.setZoom(2);

    let upper = new ra.Plane();
    upper.setSize(16, 16);

    let lower = new ra.Plane();
    lower.setSize(16, 16);

    ra.setSize(16, 16);
    ra.usePlane([lower, upper]);

    // Draw upper plane, dirt on ground.
    upper.fillColor(0);
    upper.setColor(33);
    upper.fillRect({x: 0, y: 11, w: 16, h: 5});
    upper.setColor(17);
    upper.drawLine({x0: 0, y0: 11, x1: 16, y1: 11});
    upper.setColor(25);
    upper.drawLine({x0: 0, y0: 12, x1: 16, y1: 12});
    upper.setColor(9);
    upper.drawDot({x: 1, y: 14});
    upper.drawDot({x: 5, y: 15});
    upper.drawDot({x: 8, y: 13});
    upper.drawDot({x:12, y: 15});

    // Draw lower plane, the sun.
    lower.fillColor(32);
    lower.setColor(42);
    lower.fillCircle({x: 2, y: 2, r: 6});

    ra.setComponent('camera', 1);
    ra.setScrollX(5);

    util.renderCompareTo(ra, 'test/testdata/sunset_scroll_top.png');
  });

  it('upper layer is smaller', function() {
    ra.resetState();
    ra.setZoom(2);

    let upper = new ra.Plane();
    upper.setSize(16, 4);

    let lower = new ra.Plane();
    lower.setSize(16, 16);

    ra.setSize(16, 16);
    ra.usePlane([lower, upper]);

    // Draw upper plane, dirt on ground.
    upper.fillColor(0);
    upper.setColor(33);
    upper.fillRect({x: 0, y: 0, w: 16, h: 4});
    upper.setColor(17);
    upper.drawLine({x0: 0, y0: 0, x1: 16, y1: 0});
    upper.setColor(25);
    upper.drawLine({x0: 0, y0: 1, x1: 16, y1: 1});
    upper.setColor(9);
    upper.drawDot({x: 1, y: 2});
    upper.drawDot({x: 5, y: 3});
    upper.drawDot({x: 8, y: 1});
    upper.drawDot({x:12, y: 3});

    // Draw lower plane, the sun.
    lower.fillColor(32);
    lower.setColor(42);
    lower.fillCircle({x: 2, y: 2, r: 6});

    ra.setComponent('camera', 1);
    ra.setScrollY(-12);

    util.renderCompareTo(ra, 'test/testdata/sunset_less.png');
  });

  it('smaller layer doesnt wrap', function() {
    ra.resetState();
    ra.setZoom(2);

    let upper = new ra.Plane();
    upper.setSize(16, 4);

    let lower = new ra.Plane();
    lower.setSize(16, 16);

    ra.setSize(16, 16);
    ra.usePlane([lower, upper]);

    // Draw upper plane, dirt on ground.
    upper.fillColor(0);
    upper.setColor(33);
    upper.fillRect({x: 0, y: 0, w: 16, h: 4});
    upper.setColor(17);
    upper.drawLine({x0: 0, y0: 0, x1: 16, y1: 0});
    upper.setColor(25);
    upper.drawLine({x0: 0, y0: 1, x1: 16, y1: 1});
    upper.setColor(9);
    upper.drawDot({x: 1, y: 2});
    upper.drawDot({x: 5, y: 3});
    upper.drawDot({x: 8, y: 1});
    upper.drawDot({x:12, y: 3});

    // Draw lower plane, the sun.
    lower.fillColor(32);
    lower.setColor(42);
    lower.fillCircle({x: 2, y: 2, r: 6});

    ra.setComponent('camera', 1);
    ra.setScrollY(-12);
    ra.setScrollX(-4);

    util.renderCompareTo(ra, 'test/testdata/sunset_clip.png');
  });

  it('smaller layer into middle', function() {
    ra.resetState();
    ra.setZoom(2);

    let upper = new ra.Plane();
    upper.setSize(12, 4);

    let lower = new ra.Plane();
    lower.setSize(16, 16);

    ra.setSize(16, 16);
    ra.usePlane([lower, upper]);

    // Draw upper plane, dirt on ground.
    upper.fillColor(0);
    upper.setColor(33);
    upper.fillRect({x: 0, y: 0, w: 16, h: 4});
    upper.setColor(17);
    upper.drawLine({x0: 0, y0: 0, x1: 16, y1: 0});
    upper.setColor(25);
    upper.drawLine({x0: 0, y0: 1, x1: 16, y1: 1});
    upper.setColor(9);
    upper.drawDot({x: 1, y: 2});
    upper.drawDot({x: 5, y: 3});
    upper.drawDot({x: 8, y: 1});
    upper.drawDot({x:12, y: 3});

    // Draw lower plane, the sun.
    lower.fillColor(32);
    lower.setColor(42);
    lower.fillCircle({x: 2, y: 2, r: 6});

    ra.setComponent('camera', 1);
    ra.setScrollY(-3);
    ra.setScrollX(-1);

    util.renderCompareTo(ra, 'test/testdata/sunset_into_middle.png');
  });

  it('smaller middle with interrupt', function() {
    ra.resetState();
    ra.setZoom(2);

    let upper = new ra.Plane();
    upper.setSize(12, 4);

    let lower = new ra.Plane();
    lower.setSize(16, 16);

    ra.setSize(16, 16);
    ra.usePlane([lower, upper]);

    // Draw upper plane, dirt on ground.
    upper.fillColor(0);
    upper.setColor(33);
    upper.fillRect({x: 0, y: 0, w: 16, h: 4});
    upper.setColor(17);
    upper.drawLine({x0: 0, y0: 0, x1: 16, y1: 0});
    upper.setColor(25);
    upper.drawLine({x0: 0, y0: 1, x1: 16, y1: 1});
    upper.setColor(9);
    upper.drawDot({x: 1, y: 2});
    upper.drawDot({x: 5, y: 3});
    upper.drawDot({x: 8, y: 1});
    upper.drawDot({x:12, y: 3});

    // Draw lower plane, the sun.
    lower.fillColor(32);
    lower.setColor(42);
    lower.fillCircle({x: 2, y: 2, r: 6});

    ra.setComponent('camera', 1);
    ra.setScrollY(-2);
    ra.setScrollX(-2);

    ra.useInterrupts([
      {
        scanline: 5,
        irq:() => {
          ra.setComponent('camera', 1);
          ra.setScrollY(-999);
          ra.setScrollX(-999);
        }
      },
      {
        scanline: 13,
        irq:() => {
          ra.setComponent('camera', 1);
          ra.setScrollY(-11);
          ra.setScrollX(-2);
        }
      }
    ]);

    util.renderCompareTo(ra, 'test/testdata/cookie_using_irq.png');
  });

  it('upper layer with tileset', function() {
    ra.resetState();
    ra.setZoom(2);

    ra.usePalette('quick');

    let img = ra.loadImage('test/testdata/tiles.png');
    let tileset = new ra.Tileset({tile_width: 4, tile_height: 4});
    tileset.addFrom(img);

    let upper = new ra.Plane();
    upper.setSize(4, 1);

    let lower = new ra.Plane();
    lower.setSize(16, 16);

    ra.setSize(16, 16);
    ra.usePlane([lower, upper]);
    ra.useTileset([tileset]);

    // Draw upper plane, dirt on ground.
    upper.fillPattern([[2, 2, 6, 2]]);

    // Draw lower plane, the sun.
    lower.fillColor(32);
    lower.setColor(42);
    lower.fillCircle({x: 2, y: 2, r: 6});

    // create layering and then later on scroll
    ra.useLayering([
      {
        layer: 0, plane: 0,
      },
      {
        layer: 1, plane: 1, tileset: 0,
      }
    ]);

    ra.setComponent('camera', 1);
    ra.setScrollY(-12);

    util.renderCompareTo(ra, 'test/testdata/sunset_upper_tiles.png');
  });

  it('upper tileset layering maintains scroll', function() {
    ra.resetState();
    ra.setZoom(2);

    ra.usePalette('quick');

    let img = ra.loadImage('test/testdata/tiles.png');
    let tileset = new ra.Tileset({tile_width: 4, tile_height: 4});
    tileset.addFrom(img);

    let upper = new ra.Plane();
    upper.setSize(4, 1);

    let lower = new ra.Plane();
    lower.setSize(16, 16);

    ra.setSize(16, 16);
    ra.usePlane([lower, upper]);
    ra.useTileset([tileset]);

    // Draw upper plane, dirt on ground.
    upper.fillPattern([[2, 2, 6, 2]]);

    // Draw lower plane, the sun.
    lower.fillColor(32);
    lower.setColor(42);
    lower.fillCircle({x: 2, y: 2, r: 6});

    // set scroll before laying should still work
    ra.setComponent('camera', 1);
    ra.setScrollY(-12);

    ra.useLayering([
      {
        layer: 0, plane: 0,
      },
      {
        layer: 1, plane: 1, tileset: 0,
      }
    ]);

    // BUG: calling useLayering after setScrollY will erase the old values
    // in particular, the camera value is reset to 0
    util.renderCompareTo(ra, 'test/testdata/sunset_upper_zero.png');
  });


});
