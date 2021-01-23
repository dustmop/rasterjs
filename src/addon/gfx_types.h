#include <cstdint>

#ifndef _GFX_TYPES_H
#define _GFX_TYPES_H

typedef struct GfxTarget {
	uint32_t* buffer;
	int width;
	int height;
	int rowSize;
} GfxTarget;

typedef struct PointList {
	int num;
	int* xs;
	int* ys;
} PointList;

#endif
