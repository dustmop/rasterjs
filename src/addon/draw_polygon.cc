#include <SDL.h>

#define MAX_POLY_CORNERS 16

void drawPolygon(SDL_Renderer* renderer, int* point_x, int* point_y, int num_points) {
  int numEdges, edgeX[MAX_POLY_CORNERS];
  int pixelX, pixelY;
  int i, j, swap;
  int numCorners = 0;
  double polyYi, polyYj, polyXi, polyXj;

  int imageTop, imageBottom;
  int imageLeft, imageRight;
  imageTop = 9999;
  imageBottom = 0;
  imageLeft = 9999;
  imageRight = 0;

  // Count number of corners, and find polygon's top and bottom.
  for (i = 0; i < num_points; i++) {
    if (point_x[i] < imageLeft) {
      imageLeft = point_x[i];
    }
    if (point_x[i] > imageRight) {
      imageRight = point_x[i];
    }
    if (point_y[i] < imageTop) {
      imageTop = point_y[i];
    }
    if (point_y[i] > imageBottom) {
      imageBottom = point_y[i];
    }
    numCorners++;
  }

  //  Loop through the rows of the image.
  for (pixelY = imageTop; pixelY < imageBottom; pixelY++) {

    //  Build a list of edges.
    numEdges = 0;
    j = numCorners-1;
    for (i = 0; i < numCorners; i++) {
      polyXi = point_x[i];
      polyXj = point_x[j];
      polyYi = point_y[i];
      polyYj = point_y[j];
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
          //fillPixel(pixelX,pixelY); }}}
          SDL_RenderDrawPoint(renderer, pixelX, pixelY);
        }
      }
    }
  }
}
