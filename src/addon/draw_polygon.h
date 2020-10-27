#include <SDL.h>

#include "gfx_types.h"

//void drawPolygon(SDL_Renderer* renderer, int* point_x, int* point_y, int num_points);
void drawPolygon(GfxTarget* target, PointList* points, uint32_t color);
