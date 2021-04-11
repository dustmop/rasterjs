#include <cstdint>
#include <vector>

#ifndef _GFX_TYPES_H
#define _GFX_TYPES_H

struct GfxTarget {
  uint32_t* buffer;
  int width;
  int height;
  int rowSize;
};

class Point {
 public:
  int x;
  int y;
  Point(int x = 0, int y = 0) {
    this->x = x;
    this->y = y;
  }
};

typedef std::vector<Point> PointList;

#endif
