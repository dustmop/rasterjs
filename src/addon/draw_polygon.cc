#include <SDL.h>

#include "gfx_types.h"

#define MAX_POLY_CORNERS 16

int first = 1;

void drawPolygon(GfxTarget* target, PointList* points, uint32_t color) {
  int numEdges, edgeX[MAX_POLY_CORNERS];
  int pixelX, pixelY;
  int i, j, swap;
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

  //  Loop through the rows of the image.
  for (pixelY = imageTop; pixelY < imageBottom; pixelY++) {

    //  Build a list of edges.
    numEdges = 0;
    j = numCorners-1;
    for (i = 0; i < numCorners; i++) {
      polyXi = points->xs[i];
      polyXj = points->xs[j];
      polyYi = points->ys[i];
      polyYj = points->ys[j];
      if ((polyYi <  (double) pixelY &&
           polyYj >= (double) pixelY) ||
          (polyYj <  (double) pixelY &&
           polyYi >= (double) pixelY)) {
        edgeX[numEdges++]=(int) (polyXi+(pixelY-polyYi)/(polyYj-polyYi)*(polyXj-polyXi));
      }
      j = i;
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

    //  Fill the pixels between node pairs.
    for (i=0; i < numEdges; i+=2) {
      if   (edgeX[i  ] >= imageRight) break;
      if   (edgeX[i+1] > imageLeft) {
        if (edgeX[i  ] < imageLeft ) {
          edgeX[i  ] = imageLeft;
        }
        if (edgeX[i+1]> imageRight) {
          edgeX[i+1] = imageRight;
        }
        for (pixelX=edgeX[i]; pixelX<edgeX[i+1]; pixelX++) {
          if (first) {
            first = 0;
            printf("pixelX = %d\n", pixelX);
            printf("pixelY = %d\n", pixelY);
            printf("pitch = %d\n", target->pitch);
            int index = pixelX + pixelY*target->pitch/4;
            printf("index = %d\n", index);
          }
          target->buffer[pixelX + pixelY*target->pitch/4] = color;
        }
      }
    }
  }
}
