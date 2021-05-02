#include "type.h"

void putRange(GfxTarget* target, int x0, int y0, int x1, int y1, uint32_t color);

void putRect(GfxTarget* target, int x0, int y0, int x1, int y1, bool fill, uint32_t color);

void putLine(GfxTarget* target, const PointList& points, uint32_t color, int connectCorners);

void putPolygonFill(GfxTarget* target, const PointList& points, uint32_t color);

void putPolygonOutline(GfxTarget* target, const PointList& points, uint32_t color);
