#include "type.h"

struct Image {
  uint8* buff;
  int top;
  int left;
  int width;
  int height;
  int pitch;
};

int LoadPng(const char* filename, Image* img);

int WritePng(const char* savepath, uint8* buffer, int width, int height, int pitch);
