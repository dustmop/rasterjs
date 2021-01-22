#include <stdio.h>

#include "gfx_types.h"
#include "line.h"

#define MAX_POLY_CORNERS 16

void fillPolygon(GfxTarget* target, PointList* points, uint32_t color) {
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
  if (y1 >= target->y_size) {
    y1 = target->y_size - 1;
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
      if (x1 >= target->x_size) {
        x1 = target->x_size - 1;
      }
      for (pixelX=x0; pixelX<=x1; pixelX++) {
        target->buffer[pixelX + pixelY*target->row_size] = color;
      }
    }
  }
}

int segment_x[2];
int segment_y[2];

void drawPolygonOutline(GfxTarget* target, PointList* points, uint32_t color) {
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
    drawLine(target, &line_segment, color, 1);
  }
}
