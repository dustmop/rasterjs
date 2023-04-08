# Raster.js

raster.js is a retro graphics framework

It lets you create graphics that imitate vintage computers and ancient game hardware, using javascript. It is great for making pixel art, exploring 2d demo effects, and creative coding.

It aims to serve as a tool for prototyping, experimentation, and learning about how old school graphics worked. It provides precise pixel control, and portability across multiple javascript environments and rendering contexts.

# Features

* Pixel based, hard edges, no anti-aliasing
* Limited 8-bit palette, default 64 colors, expandable to 256
* Runs in multiple places: in browser using webgl, in node.js using SDL, on raspberry pi using dispmanx
* Easy utilities for saving gifs and pngs
* Colors presets for machines such as the NES, ZX Spectrum, Pico-8, Gameboy, DOS, and more
* Features that imitate ancient hardware such as color attributes and rasterization interrupts
* Ability to recreate classic effects like parallax and palette cycling using programming interfaces similar to what was used back in the day

# Example Usage

```
const ra = require('raster');
ra.setSize(32, 30);
ra.setZoom(8);

ra.fillColor(19);
ra.setColor(37);
ra.fillCircle({x: 9, y: 16, r: 6});
ra.drawPolygon([[22, 3], [30, 11], [17, 13]]);
ra.setColor(33);
ra.drawRect({x: 4, y: 2, w: 6, h: 10});
ra.fillFlood(22, 8);

ra.show();
```

![](asset/example.png)

# Installing

You can use raster.js either in the browser using canvas, or on the command-line using node.js (graphics will appear in a new SDL window).

### Browser

Either grab `raster.min.js` from the latest release, or clone this repo and run:

```
npm run build
```

which outputs `dist/raster.min.js`

You can also create a development build (less efficient, but better for debugging) by running:

```
npm run dev
```

### Node.js

Installing raster.js for use with node.js requires setting up an environment that can build native add-ons. This means you need to install Python and a C++ compiler, see [the node-gyp instructions for your operating system](https://github.com/nodejs/node-gyp#installation).

Using SDL requires the installing the SDL2 development libraries. See below for platform specific details. Once you have them properly setup, run

```
npm install raster
```

### SDL2, macos

On macos, run `brew install sdl2` to get SDL2.

### SDL2, Windows

For Windows, it is recommended to use [msys2](https://www.msys2.org/), but Powershell and WSL will probably work too. Grab the latest [SDL release](https://github.com/libsdl-org/SDL/releases) and get `SDL2-devel-<version>-mingw.zip`. Extract this zip to get the `SDL2-<version>` folder and place it within the directory `c:/SDL/`, so that it ends up at `c:/SDL/SDL2-<version>/`. If you use to use a different location instead of `c:/SDL/`, assign that location to the environment variable `SDL_PATH`.

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

The display can increase the size of its pixels, as it appears on your physical screen, using the `setZoom` method. Note that this does not change the number of the pixels themselves.

```
ra.setZoom(8);
```

## Drawing pixels

Clearing the display can be done using the `fillColor` method. Raster.js uses a limited color palette, just like many retro computer systems, limited to at most 256 colors. The default palette can be found in the "colors" section below. Functions that require a color parameter, such as `fillColor`, therefore only require a single numerical parameter, which uses that color from the palette.

```
ra.fillColor(12);
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

For animation, use `ra.run` instead of `ra.show`, and pass a draw function that is used to update the display every frame.

```
function draw() {
  ra.setColor(8+ra.time/2);
  ra.drawLine(0, 0, ra.oscil({max:80}), ra.oscil({max:80,begin:0.5}));
}

ra.run(draw);
```

# Command-line options

When running from a node.js script, you can pass command-line parameters to modify raster.js's behaviour.

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
--colors [colorMap]
```

Use a specific colorMap. See `useColors` in the docs for the names of built-in colorMaps.

# Colors

The default colorMap for raster.js is the "quick" colors, shown here:

![](asset/quick-rgbmap.png)

# API

See [the docs](docs.md) for the full documentation of the methods available in raster.js.

# Coming soon

See the [upcoming plans](plan.md) of what's coming in the future.
