#include "type.h"
#include <cstdlib> // abs
#include <math.h>

void swap(int* a, int* b) {
  static int tmp;
  tmp = *a;
  *a = *b;
  *b = tmp;
}

void swapFloat(float* a, float* b) {
  static float tmp;
  tmp = *a;
  *a = *b;
  *b = tmp;
}

void putRange(GfxTarget* target, int x0, int y0, int x1, int y1, uint32_t color) {
  if (x0 > x1) {
    swap(&x0, &x1);
  }
  if (y0 > y1) {
    swap(&y0, &y1);
  }
  if (x0 == x1) {
    if (x0 < 0 || x1 >= target->width) {
      return;
    }
    if (y0 < 0) {
      y0 = 0;
    }
    if (y1 >= target->height) {
      y1 = target->height - 1;
    }
    int x = x0;
    for (int y = y0; y <= y1; y++) {
      target->buffer[x + y*target->rowSize] = color;
    }
  } else {
    if (y0 < 0 || y1 >= target->height) {
      return;
    }
    if (x0 < 0) {
      x0 = 0;
    }
    if (x1 >= target->width) {
      x1 = target->width - 1;
    }
    int y = y0;
    for (int x = x0; x <= x1; x++) {
      target->buffer[x + y*target->rowSize] = color;
    }
  }
}

void putRect(GfxTarget* target, int x0, int y0, int x1, int y1, bool fill, uint32_t color) {
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

  if (x0 >= target->width) {
    return;
  }
  if (y0 >= target->height) {
    return;
  }

  if (x0 < 0) {
    x0 = 0;
  }
  if (x1 >= target->width) {
    x1 = target->width;
  }
  if (y0 < 0) {
    y0 = 0;
  }
  if (y1 >= target->height) {
    y1 = target->height;
  }

  if (fill) {
    for (int y = y0; y < y1; y++) {
      for (int x = x0; x < x1; x++) {
        target->buffer[x + y*target->rowSize] = color;
      }
    }
  } else {
    int x, y;
    // Horizontal lines
    for (x = x0; x < x1; x++) {
      y = y0;
      target->buffer[x + y*target->rowSize] = color;
      y = y1 - 1;
      target->buffer[x + y*target->rowSize] = color;
    }
    // Vertical lines
    for (y = y0; y < y1; y++) {
      x = x0;
      target->buffer[x + y*target->rowSize] = color;
      x = x1 - 1;
      target->buffer[x + y*target->rowSize] = color;
    }
  }
}
