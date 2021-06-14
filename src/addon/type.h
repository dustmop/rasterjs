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

#endif

