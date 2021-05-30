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

class IntPoint {
 public:
  int x;
  int y;
  IntPoint(int x = 0, int y = 0) {
    this->x = x;
    this->y = y;
  }
};

class FloatPoint {
 public:
  float x;
  float y;
  FloatPoint(float x = 0, float y = 0) {
    this->x = x;
    this->y = y;
  }
};

#define TYPE_INT_POINT 1
#define TYPE_FLOAT_POINT 2

class PointList {
 public:
  int type;
  std::vector<IntPoint> ip;
  std::vector<FloatPoint> fp;
  size_t size() const {
    if (this->type == TYPE_INT_POINT) {
      return this->ip.size();
    }
    return this->fp.size();
  }
  PointList convertFloatToInt() const {
    if (this->type == TYPE_INT_POINT) {
      return *this;
    }
    PointList make;
    make.type = TYPE_INT_POINT;
    for (size_t k = 0; k < this->fp.size(); k++) {
      const FloatPoint& p = this->fp[k];
      make.ip.push_back(IntPoint(p.x, p.y));
    }
    return make;
  }
  std::vector<FloatPoint> asFloats() const {
    if (this->type == TYPE_FLOAT_POINT) {
      return this->fp;
    }
    std::vector<FloatPoint> fp;
    for (size_t k = 0; k < this->ip.size(); k++) {
      const IntPoint& p = this->ip[k];
      fp.push_back(FloatPoint(p.x + 0.5000001, p.y + 0.500001));
    }
    return fp;
  }
};

#endif
