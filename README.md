# Raster.js

raster.js is a graphics library for javascript that is designed for pixel art, 2d demo effects, and creative coding.

It aims to serve as a tool for prototyping, experimentation, and learning about how old school graphics worked. It provides precise pixel control, and portability across multiple javascript environments and rendering contexts.

# Example Usage

```
const ra = require('raster');
ra.setSize(32, 30);
ra.setZoom(8);

ra.fillBackground(19);
ra.setColor(37);
ra.fillCircle({x: 9, y: 16, r: 6});
ra.drawPolygon([[22, 3], [30, 11], [17, 13]]);
ra.setColor(33);
ra.drawRect({x: 4, y: 2, w: 6, h: 10});
ra.fillFlood(22, 8);

ra.show();
```

# Installation

```
npm install raster
```

Building requires the SDL2 source files.

# Environments

Running in a terminal using node.js, the scene will be displayed in an SDL window

Running in a web browser, the scene will be displayed in canvas element backed by WebGL

# Getting started

Using raster.js starts with importing the library, usually naming it simply `ra`.

```
const ra = require('raster');
```

This library gives a number of useful functions.

## Setup

The size of the display (measured in pixels) can be set using the `setSize` method. First comes `x` (the width), then `y` (the height).

```
ra.setSize(32, 30);
```

The display can increase the size of its pixels, as it appears on your physical scene, using the `setZoom` method. Note that this does not change the number of the pixels themselves.

```
ra.setZoom(8);
```

## Drawing pixels

Clearing the display can be done using the `fillBackground` method. Raster.js uses a limited color palette, just like many retro computer systems, limited to at most 256 colors. The default palette can be found in the "colors" section. Functions that require a color parameter, such as `fillBackground`, therefore only require a single numerical parameter, which uses that color from the palette.

```
ra.fillBackground(12);
```

For other drawing functions, use `setColor` to choose what color to draw with.

```
ra.setColor(37)
```

Then draw some things to the display.

```
ra.fillCircle({x: 9, y: 16, r: 6});
ra.drawPolygon([[22, 3], [30, 11], [17, 13]]);
```

The same color will be using for drawing until it is changed again with `setColor`.

```
ra.setColor(33);
ra.drawRect({x: 4, y: 2, w: 6, h: 10});
ra.fillFlood(22, 8);
```

## Showing it

Once this is complete, and the image is ready for display, use `ra.show` to see it.

```
ra.show();
```

## Animation

For animation, use `ra.run` instead of `ra.show`, and pass a render function that is used to update the display every frame.

```
function renderFrame() {
  ra.setColor(8+ra.time/2);
  ra.drawLine(0, 0, ra.oscil()*80, ra.oscil(null, 0.5)*80);
}

ra.run(renderFrame);
```

# Command-line options

When running from a node.js script, you can pass command-line parameters to modify raster.js's behavior.

```
--num-frames [num]
```

The number of frames to display, then quit.

```
--save [output-filename]
```

Save an image (png or gif) instead of using the default display.

```
--display [display]
```

Change the display. See `useDisplay` in the docs for supported displays.

```
--zoom [zoom]
```

Change the zoom level.

```
--colors [colorSet]
```

Use a specific colorSet. See `useColors` in the docs for supported colorSets.

# API

See [the docs](docs.md) for the full documentation of the methods avaiable in raster.js.
