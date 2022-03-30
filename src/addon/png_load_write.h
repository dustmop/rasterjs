#include "type.h"

struct Surface {
  uint8* buff;
  int top;
  int left;
  int width;
  int height;
  int pitch;
};

int LoadPng(const char* filename, Surface* surf);

int WritePng(const char* savepath, Surface* surf);
