#include "gfx_types.h"
#include <cstdlib> // abs

void swap(int* a, int* b) {
  static int tmp;
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

void putLine(GfxTarget* target, PointList* points, uint32_t color, int connectCorners) {
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
      if (x >= 0 && x < target->width && y >= 0 && y < target->height) {
        target->buffer[x + y*target->rowSize] = color;
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
      if (x >= 0 && x < target->width && y >= 0 && y < target->height) {
        target->buffer[x + y*target->rowSize] = color;
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

#define MAX_POLY_CORNERS 16

void putPolygonFill(GfxTarget* target, PointList* points, uint32_t color) {
  int numEdges, edgeX[MAX_POLY_CORNERS], edgeDir[MAX_POLY_CORNERS];
  int pixelX, pixelY;
  int i, j, swap, prev;
  int numCorners = 0;
  double polyYi, polyYj, polyXi, polyXj;

  int imageTop, imageBottom;
  int imageLeft, imageRight;
  imageTop = points->ys[0];
  imageBottom = points->ys[0];
  imageLeft = points->xs[0];
  imageRight = points->xs[0];
  numCorners++;

  // Count number of corners, and find polygon's top and bottom.
  for (i = 1; i < points->num; i++) {
    if (points->xs[i] < imageLeft) {
      imageLeft = points->xs[i];
    }
    if (points->xs[i] > imageRight) {
      imageRight = points->xs[i];
    }
    if (points->ys[i] < imageTop) {
      imageTop = points->ys[i];
    }
    if (points->ys[i] > imageBottom) {
      imageBottom = points->ys[i];
    }
    numCorners++;
  }

  int y0 = imageTop;
  int y1 = imageBottom;
  if (y0 < 0) {
    y0 = 0;
  }
  if (y1 >= target->height) {
    y1 = target->height - 1;
  }

  //  Loop through the rows of the image.
  for (pixelY = imageTop; pixelY <= imageBottom; pixelY++) {
    //  Build a list of edges.
    numEdges = 0;
    prev = numCorners-1;
    for (i = 0; i < numCorners; i++) {
      j = prev;
      prev = i;

      polyXi = points->xs[i];
      polyXj = points->xs[j];
      polyYi = points->ys[i];
      polyYj = points->ys[j];

      double scanlineY = pixelY;
      // If the current scanline's Y position overlaps the line segment.
      if ((polyYi <= scanlineY && polyYj >= scanlineY) ||
          (polyYj <= scanlineY && polyYi >= scanlineY)) {

        if (polyYi == polyYj) {
          continue;
        }

        // Calculate where the edge intersects the scanline.
        double deltaX = polyXj - polyXi;
        double deltaY = polyYj - polyYi;
        double slope = (pixelY-polyYi)/deltaY*deltaX;
        int intersect = polyXi + (int)(slope);
        int lineDirY = deltaY >= 0 ? 1 : -1;

        // If edge is already intersecting this pixel, and this edge
        // is going in the same direction, skip adding it.
        if (numEdges > 0) {
          int last = numEdges-1;
          if (edgeX[last] == intersect && edgeDir[last] == lineDirY) {
            continue;
          }
          if (edgeX[0] == intersect && edgeDir[0] == lineDirY) {
            continue;
          }
        }

        // Add the edge intersection.
        edgeX[numEdges] = intersect;
        edgeDir[numEdges] = lineDirY;
        numEdges++;
      }
    }

    //  Sort the numEdges, via a simple “Bubble” sort.
    i = 0;
    while (i < numEdges - 1) {
      if (edgeX[i] > edgeX[i+1]) {
        swap = edgeX[i];
        edgeX[i] = edgeX[i+1];
        edgeX[i+1]=swap;
        if (i) {
          i--;
        }
      }
      else {
        i++;
      }
    }

    // Fill the pixels between the edges.
    for (i=0; i < numEdges; i+=2) {
      int x0 = edgeX[i];
      int x1 = edgeX[i+1];
      if (x0 < 0) {
        x0 = 0;
      }
      if (x1 >= target->width) {
        x1 = target->width - 1;
      }
      for (pixelX=x0; pixelX<=x1; pixelX++) {
        target->buffer[pixelX + pixelY*target->rowSize] = color;
      }
    }
  }
}

int segment_x[2];
int segment_y[2];

void putPolygonOutline(GfxTarget* target, PointList* points, uint32_t color) {
  PointList line_segment;
  line_segment.num = 2;
  line_segment.xs = segment_x;
  line_segment.ys = segment_y;

  for (int k = 0; k < points->num; k++) {
    if (k < points->num - 1) {
      line_segment.xs[0] = points->xs[k+0];
      line_segment.xs[1] = points->xs[k+1];
      line_segment.ys[0] = points->ys[k+0];
      line_segment.ys[1] = points->ys[k+1];
    } else {
      line_segment.xs[0] = points->xs[k];
      line_segment.xs[1] = points->xs[0];
      line_segment.ys[0] = points->ys[k];
      line_segment.ys[1] = points->ys[0];
    }
    putLine(target, &line_segment, color, 1);
  }
}

