# API

The API should be considered unstable for now, subject to changes until a 1.0 release.

## Setup functions

```
setSize
setZoom
setTitle
originAtCenter
useColors
useDisplay
```

### setSize(w, h)

Set the size of the display and standard plane, in pixels.

### setZoom(zoom)

Set the zoom level, in other words, the size of a single pixel as it appears on the physical viewing screen. Not supported by all environments.

### setTitle(title)

If the display is in a window, sets the title of that window. Also used by discovery services to determine the name of a script without running it.

### originAtCenter()

Move the x,y coordinate system's origin to the center of the plane, instead of the upper-left.

### useColors(colorset)

Assigns the color set to use for displaying the scene. May either be the name of a pre-existing color set, or a list of rgb values.

Names of pre-existing color sets:

`dos`: Colors used by the DOS operating system. TODO: Specify which video standard.

`nes`: Colors used by the NES 8-bit console.

`grey`: A grey scale color set.

### useDisplay(display)

The display to use, instead of the default display. Either the name of a pre-existing display, or an object with the methods `initialize`, `setSource`, and `renderLoop`.

Names of pre-existing displays:

`ascii`: When running in a terminal, output ascii art to stdout.

## Utility functions

```
loadImage
makePolygon
rotatePolygon
oscil
on
```

### loadImage(filename)

Loads an image, by opening it and reading its contents. Can be passed to `drawImage` once reading has completed.

### makePolygon(shape)

Converts a set of a points into a polygon.

### rotatePolygon(shape, angle)

Rotates the given polygon by the given angle, returning a new polygon.

### oscil(period, fracOffset, click)

TODO

### on(eventName, callback)

TODO

## Special variables

```
time
timeClick
TAU
```

### time

The number of seconds since the scene begin, as a floating point value.

### timeClick

The number of frames that have rendered so far, increasing by 1 per frame.

### TAU

A mathematical constant representing the number of radians in the full rotation of a circle around a plane.

## Color usage

```
fillBackground
fillTrueBackground
setColor
setTrueColor
```

TODO

## Drawing

For most of these methods, there are two versions, one starting with `draw` and another starting with `fill`. The former only renders the outside of a shape, the latter will fill it in.

```
drawLine     -
drawDot      fillDot
drawSquare   fillSquare
drawRect     fillRect
drawCircle   fillCircle
drawPolygon  fillPolygon
drawImage    -
-            fillFrame
-            fillFlood
```

### drawLine(x0, y0, x1, y1, cc)

TODO

### drawDot(x, y)

TODO

### fillDot(dots)

TODO

### drawSquare(x, y, size)

TODO

### fillSquare(x, y, size)

TODO

### drawRect(x, y, w, h)

TODO

### fillRect(x, y, w, h)

TODO

### drawCircle(x, y, r, width)

TODO

### fillCircle(x, y, r)

TODO

### drawPolygon(shape, x?, y?)

A shape is either a list of points (such as `[[3,4],[5,6],[7,8]`) or a polygon object as returned by `makePolygon` or `rotatePolygon`. This method drawing the outline of the polygon, offset by the optional x,y position.

### fillPolygon(shape, x?, y?)

A shape is either a list of points or a polygon object. This method fills in that polygon, offset by the optional x,y position.

### drawImage(img, x, y)

draw an image to the plane, downsampling it to match the allowed colors.

`img`: An image that was created by `loadImage`. NOTE: If raster.js is running in an async environment, such as in a web browser, calls to `drawImage` must be made inside of a render function such as those passed to `show` or `run`, while `loadImage` must be called earlier, such as at the script's top-level.

`x`: X dimension (left ) of the upper-left point where drawing starts.

`y`: Y dimension (top) of the upper-left point where drawing starts.

### fillFrame(options, callback)

fillFrame iterates over each pixel of the plane, and invokes the callback with a `mem` representing the frame's data.

`options`: An optional object. Supported fields: `previous` if true, maintain an immutable copy of the previous frame.

`callback`: A callback to be invoked with the frame data. The parameters to this callback may take two forms:

> `function(mem)`

For this version, the callback will be invoked once. Inside, code may use `mem.get(x, y)` to get pixel data, and `mem.put(x, y, v)` to assign pixel data. The method `mem.getPrevious(x, y)` is allowed if and only if `previous` was passed using `options`.

> `function(mem, x, y)`

For this version, the callback will be invoked per each pixel in the plane. Code may use `mem.get` and `mem.put` as mentioned above. In addition, if the callback returns a number, that number will be assigned to that pixel. Otherwise the pixel's value is not modified.

### fillFlood(x, y)

Fill a region of contiguous color, by replacing it with the current set color. Starts at the given x,y coordinate and floods from there.

## Palette access

```
getPaletteEntry
getPaletteAll
```

TODO

## Display

```
run
show
save
showFrame
quit
nextFrame
```

### run(renderFunc)

Render the plane to the display. The render function is called once per frame, before the display is updated with the new frame.

### show(renderFunc)

Render the plane to the display once.

### save(filename)

Save the plane to the given filename. May only be run in an environment that supports creating files.

### showFrame(options, callback)

The same as `fillFrame` followed by `show`.

### quit()

Quits the application.

### nextFrame()

Waits one frame.
