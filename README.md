# Raster.js

raster.js is a graphics library for javascript that is designed for pixel art, 2d demo effects, and creative coding.

It aims to serve as a tool for prototyping, experimentation, and learning about how old school graphics worked. It provides precise pixel control, and portability across multiple javascript environments and rendering contexts.

## Example Usage

```
const ra = require('raster.js');
ra.setSize(100, 100);

ra.fillBackground(0x21);
ra.setColor(0x15);
ra.drawSquare({x: 15, y: 22, size: 40});
ra.setColor(0x25);
ra.fillSquare({x: 16, y: 23, size: 38});

ra.show();
```

## Installation

TODO

## Building

Clone this repo, and `cd` into it.

For running in node.js:

```
npm install
```

For running in a browser:

```
npm run build
```

## Environments

Running in node.js, drawing will be displayed in an SDL window

Running in browser, drawing will be displayed in a WebGL backed canvas element

## API

For many primitive shape methods, there are two versions, one starting with `draw` and another starting with `fill`. The former only renders the outside of a shape, the latter will fill it in.

```
-            fillBackground
drawDot      -
drawLine     -
drawCircle   fillCircle
drawPolygon  fillPolygon
drawSquare   fillSquare
drawRect     fillRect
-            fillFrame
drawImage    -
```

TODO: Full API documentation

The API should be considered unstable for now, subject to changes until a 1.0 release.
