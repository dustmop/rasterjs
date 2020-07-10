#include "type.h"

struct Image {
	void* data;
};

Image* LoadPng(const char* filename);

void GetPng(Image* img, int* width, int* height, uint8** data);
