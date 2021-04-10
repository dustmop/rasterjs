#include "type.h"

struct Image {
  void* data;
};

int LoadPng(const char* filename, Image** img_ptr);

void GetPng(Image* img, int* width, int* height, uint8** data);
