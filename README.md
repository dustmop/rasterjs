# Raster.js

Raster.js is a drawing library in javascript, specifically focused on making 2d graphics and facilitating knowledge about how older computer graphics techniques worked. It provides precise pixel control, and portability across multiple javascript environments and rendering contexts.

## Glossary

plane

display

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

