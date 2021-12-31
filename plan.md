* attributes
  * NES / C64 / zx-spectrum style color restrictions
  * IN PROGRESS
* raspberry pi backend
  * output using dispmanx instead of SDL
  * IN PROGRESS
* support more systems
  * zx-Spectrum
  * C64
  * Mega Drive / Genesis
  * SNES
* miniFB
  * try and see if this can be used instead of SDL
  * does it create hard-edged pixels even when zoomed in?
  * can it zoom using hardware acceleration?
* shaders
  * option to add a CRT filter
* useEmulation
  * a single call to immitate an existing retro console or computer
* tiled import
  * a tool (contrib?) that imports `tiled` projects
* text layout engine
  * center text, newline support, sizing
* drawText should work with tilesets
  * have a charmap that associates chars with tile numbers
* more demos
  * adaptive tile refresh
  * pseudo 3-d roads
  * tile swapping / animation
  * water level using palette change irq
  * Mother style animated backgrounds
* sprites
  * per-scanline limits like on NES and Mega Drive
  * flip bits
  * priority to render behind the primary plane
  * IN PROGRESS
* typescript
  * support for top-level APIs
  * may be hard due to flexible parameter passing?