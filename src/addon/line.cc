#include "stdlib.h"
#include "gfx_types.h"

#include <stdio.h>

void drawLine(GfxTarget* target, PointList* points, uint32_t color, int connectCorners) {
  int tmp;

  int x0 = points->xs[0];
  int y0 = points->ys[0];
  int x1 = points->xs[1];
  int y1 = points->ys[1];

  int deltax = x1 - x0;
  int deltay = y1 - y0;

  if (abs(deltay) <= abs(deltax)) {

    if (deltax < 0) {
      tmp = x0;
      x0 = x1;
      x1 = tmp;
      tmp = y0;
      y0 = y1;
      y1 = tmp;
      deltax = -deltax;
      deltay = -deltay;
    }

    if (connectCorners) {
      if (deltay >= 0) {
        deltay++;
      } else {
        deltay--;
      }
    }

    int dist = 2 * abs(deltay) - deltax;
    if (connectCorners) {
      dist = 2 * abs(deltay) - 2 * deltax;
    }

    int y = y0;
    for (int x = x0; x <= x1; x++) {
      // Draw a pixel
      if (x >= 0 && x < target->x_size && y >= 0 && y < target->y_size) {
        target->buffer[x + y*target->pitch/4] = color;
      }

      if (dist > 0) {
        if (deltay > 0) {
          y = y + 1;
        } else if (deltay < 0) {
          y = y - 1;
        }
        dist = dist - 2*deltax;
      }
      dist = dist + 2*abs(deltay);
    }
  } else {

    if (deltay < 0) {
      tmp = x0;
      x0 = x1;
      x1 = tmp;
      tmp = y0;
      y0 = y1;
      y1 = tmp;
      deltax = -deltax;
      deltay = -deltay;
    }

    if (connectCorners) {
      if (deltax >= 0) {
        deltax++;
      } else {
        deltax--;
      }
    }

    int dist = 2 * abs(deltax) - deltay;
    if (connectCorners) {
      dist = 2 * abs(deltax) - 2 * deltay;
    }
    int x = x0;
    for (int y = y0; y <= y1; y++) {
      // Draw a pixel
      if (x >= 0 && x < target->x_size && y >= 0 && y < target->y_size) {
        target->buffer[x + y*target->pitch/4] = color;
      }

      if (dist > 0) {
        if (deltax > 0) {
          x = x + 1;
        } else if (deltax < 0) {
          x = x - 1;
        }
        dist = dist - 2*deltay;
      }
      dist = dist + 2*abs(deltax);
    }
  }
}
