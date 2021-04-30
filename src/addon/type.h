#ifndef _TYPE_H
#define _TYPE_H

#include <cstdint>
#include <vector>

typedef unsigned char uint8;
typedef unsigned char u8_t;

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

class FloatPoint {
 public:
  float x;
  float y;
  FloatPoint(float x = 0, float y = 0) {
    this->x = x;
    this->y = y;
  }
};

typedef std::vector<FloatPoint> FloatPointList;


#endif
