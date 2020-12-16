#include "gfx_types.h"
#include <stdio.h>

void drawRect(GfxTarget* target, int x0, int y0, int x1, int y1, bool fill, uint32_t color) {
  int tmp;
  if (x0 > x1) {
    tmp = x0;
    x0 = x1;
    x1 = tmp;
  }
  if (y0 > y1) {
    tmp = y0;
    y0 = y1;
    y1 = tmp;
  }

  if (x0 >= target->x_size) {
    return;
  }
  if (y0 >= target->y_size) {
    return;
  }

  if (x0 < 0) {
    x0 = 0;
  }
  if (x1 >= target->x_size) {
    x1 = target->x_size;
  }
  if (y0 < 0) {
    y0 = 0;
  }
  if (y1 >= target->y_size) {
    y1 = target->y_size;
  }

  if (fill) {
    for (int y = y0; y < y1; y++) {
      for (int x = x0; x < x1; x++) {
        target->buffer[x + y*target->pitch/4] = color;
      }
    }
  } else {
    int x, y;
    // Horizontal lines
    for (x = x0; x < x1; x++) {
      y = y0;
      target->buffer[x + y*target->pitch/4] = color;
      y = y1 - 1;
      target->buffer[x + y*target->pitch/4] = color;
    }
    // Vertical lines
    for (y = y0; y < y1; y++) {
      x = x0;
      target->buffer[x + y*target->pitch/4] = color;
      x = x1 - 1;
      target->buffer[x + y*target->pitch/4] = color;
    }
  }
}
