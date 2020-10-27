#include "gfx_types.h"

void drawRect(GfxTarget* target, int x0, int y0, int x1, int y1, uint32_t color) {
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

  for (int y = y0; y < y1; y++) {
    for (int x = x0; x < x1; x++) {
      target->buffer[x + y*target->pitch/4] = color;
    }
  }
}
