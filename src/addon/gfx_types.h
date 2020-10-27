#include <cstdint>

#ifndef _GFX_TYPES_H
#define _GFX_TYPES_H

typedef struct GfxTarget {
	uint32_t* buffer;
	int x_size;
	int y_size;
	int pitch;
	int capacity;
} GfxTarget;

typedef struct PointList {
	int num;
	int* xs;
	int* ys;
} PointList;

#endif
