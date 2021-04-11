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

void putLine(GfxTarget* target, const PointList& points, uint32_t color, int connectCorners) {
  int x0 = points[0].x;
  int y0 = points[0].y;
  int x1 = points[1].x;
  int y1 = points[1].y;

  int deltax = x1 - x0;
  int deltay = y1 - y0;

  if (abs(deltay) <= abs(deltax)) {

    if (deltax < 0) {
      swap(&x0, &x1);
      swap(&y0, &y1);
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
      swap(&x0, &x1);
      swap(&y0, &y1);
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

void putPolygonFill(GfxTarget* target, const PointList& points, uint32_t color) {
  std::vector<int> edgeX, edgeDir;
  int pixelX, pixelY, prev;
  size_t i, j;
  double polyYi, polyYj, polyXi, polyXj;

  int imageTop, imageBottom;
  int imageLeft, imageRight;
  imageTop = points[0].y;
  imageBottom = points[0].y;
  imageLeft = points[0].x;
  imageRight = points[0].x;

  // Find polygon's top and bottom.
  for (size_t i = 1; i < points.size(); i++) {
    if (points[i].x < imageLeft) {
      imageLeft = points[i].x;
    }
    if (points[i].x > imageRight) {
      imageRight = points[i].x;
    }
    if (points[i].y < imageTop) {
      imageTop = points[i].y;
    }
    if (points[i].y > imageBottom) {
      imageBottom = points[i].y;
    }
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
    edgeX.clear();
    edgeDir.clear();

    // Build a list of edges
    for (i = 0; i < points.size(); i++) {
      if (i > 0) {
        j = i - 1;
      } else {
        j = points.size() - 1;
      }
      polyXi = points[i].x;
      polyXj = points[j].x;
      polyYi = points[i].y;
      polyYj = points[j].y;

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
        if (edgeX.size() > 0) {
          int last = edgeX.size() - 1;
          if (edgeX[last] == intersect && edgeDir[last] == lineDirY) {
            continue;
          }
          if (edgeX[0] == intersect && edgeDir[0] == lineDirY) {
            continue;
          }
        }

        // Add the edge intersection.
        edgeX.push_back(intersect);
        edgeDir.push_back(lineDirY);
      }
    }

    // Sort the edges, via a simple bubble sort.
    i = 0;
    while (i < edgeX.size() - 1) {
      if (edgeX[i] > edgeX[i+1]) {
        swap(&edgeX[i], &edgeX[i+1]);
        if (i) {
          i--;
        }
      } else {
        i++;
      }
    }

    // Fill the pixels between the edges.
    for (i = 0; i < edgeX.size(); i += 2) {
      int x0 = edgeX[i];
      int x1 = edgeX[i+1];
      if (x0 < 0) {
        x0 = 0;
      }
      if (x1 >= target->width) {
        x1 = target->width - 1;
      }
      for (pixelX = x0; pixelX <= x1; pixelX++) {
        target->buffer[pixelX + pixelY*target->rowSize] = color;
      }
    }
  }
}

void putPolygonOutline(GfxTarget* target, const PointList& points, uint32_t color) {
  PointList lineSegment;
  lineSegment.push_back(Point());
  lineSegment.push_back(Point());
  size_t i, j;

  for (i = 0; i < points.size(); i++) {
    if (i > 0) {
      j = i - 1;
    } else {
      j = points.size() - 1;
    }
    lineSegment[0].x = points[i].x;
    lineSegment[1].x = points[j].x;
    lineSegment[0].y = points[i].y;
    lineSegment[1].y = points[j].y;
    putLine(target, lineSegment, color, 1);
  }
}
