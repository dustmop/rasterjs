#include "image_load_save.h"
#include "type.h"

#include <png.h>
#include <stdlib.h>


struct imageObject {
  int width;
  int height;
  uint8* data;
};

#define ERROR_NOT_FOUND 1
#define ERROR_INVALID_HEADER 2
#define ERROR_ALLOC_FAILURE 3

int loadPngFile(const char* filename, int *outWidth, int *outHeight, unsigned char** outData, int flipVert) {
  FILE* fp = fopen(filename, "rb");
  if (!fp) {
    return ERROR_NOT_FOUND;
  }

  png_structp png = png_create_read_struct(PNG_LIBPNG_VER_STRING, 0,0,0);
  if (!png) {
    return ERROR_INVALID_HEADER;
  }

  png_infop info = png_create_info_struct(png);
  if (!info) {
    return ERROR_ALLOC_FAILURE;
  }

  png_init_io(png, fp);
  png_read_info(png, info);

  int width, height;
  png_byte color_type;
  png_byte bit_depth;
  width      = png_get_image_width(png, info);
  height     = png_get_image_height(png, info);
  color_type = png_get_color_type(png, info);
  bit_depth  = png_get_bit_depth(png, info);

  *outWidth = width;
  *outHeight = height;

  if (bit_depth == 16) {
    png_set_strip_16(png);
  }

  if (color_type == PNG_COLOR_TYPE_PALETTE) {
    png_set_palette_to_rgb(png);
  }

  if (color_type == PNG_COLOR_TYPE_GRAY && bit_depth < 8) {
    png_set_expand_gray_1_2_4_to_8(png);
  }

  if (png_get_valid(png, info, PNG_INFO_tRNS)) {
    png_set_tRNS_to_alpha(png);
  }

  if (color_type == PNG_COLOR_TYPE_RGB ||
      color_type == PNG_COLOR_TYPE_GRAY ||
      color_type == PNG_COLOR_TYPE_PALETTE) {
    png_set_filler(png, 0xff, PNG_FILLER_AFTER);
  }

  if (color_type == PNG_COLOR_TYPE_GRAY ||
      color_type == PNG_COLOR_TYPE_GRAY_ALPHA) {
    png_set_gray_to_rgb(png);
  }

  png_read_update_info(png, info);

  int row_size = png_get_rowbytes(png, info);

  // Allocate the buffer that will store uncompressed, raw pixel data
  unsigned char* buffer = (unsigned char*)malloc(row_size * height);
  *outData = buffer;

  // Set up pointers to each row of data.
  png_bytep *row_pointers = (png_bytep*)malloc(sizeof(png_bytep) * height);
  for (int y = 0; y < height; y++) {
    int i = flipVert ? (height - y - 1) : y;
    row_pointers[y] = buffer+(row_size*i);
  }

  // Read all the image data using row_pointers
  png_read_image(png, row_pointers);

  // Close file
  fclose(fp);

  // Deallocate row_pointers array
  free(row_pointers);
  // Deallocate png's read_struct
  png_destroy_read_struct(&png, &info, NULL);

  return 0;
}

int LoadPng(const char* filename, Image** img_ptr) {
  int width, height;
  uint8* data = NULL;
  int ret = loadPngFile(filename, &width, &height, &data, false);
  if (ret != 0) {
    return ret;
  }

  imageObject* obj = new imageObject;
  obj->width = width;
  obj->height = height;
  obj->data = data;
  Image* img = new Image;
  img->data = obj;

  *img_ptr = img;
  return 0;
}

void GetPng(Image* img, int* width, int* height, uint8** data) {
  imageObject* priv = (imageObject*)img->data;
  *width = priv->width;
  *height = priv->height;
  *data = priv->data;
}

int WritePng(const char* savepath, uint8* buffer, int width, int height, int pitch) {
  int code = 0;
  int y = 0;
  int transform = PNG_TRANSFORM_IDENTITY;
  FILE *fp = NULL;
  png_structp png_ptr = NULL;
  png_infop info_ptr = NULL;
  png_bytep* rows = NULL;

  // Open file for writing (binary mode)
  fp = fopen(savepath, "wb");
  if (fp == NULL) {
    fprintf(stderr, "Could not open file %s for writing\n", savepath);
    code = 1;
    goto finalise;
  }

  // Initialize write structure
  png_ptr = png_create_write_struct(PNG_LIBPNG_VER_STRING, NULL, NULL, NULL);
  if (png_ptr == NULL) {
    fprintf(stderr, "Could not allocate write struct\n");
    code = 1;
    goto finalise;
  }

  // Initialize info structure
  info_ptr = png_create_info_struct(png_ptr);
  if (info_ptr == NULL) {
    fprintf(stderr, "Could not allocate info struct\n");
    code = 1;
    goto finalise;
  }

  // Setup Exception handling
  if (setjmp(png_jmpbuf(png_ptr))) {
    fprintf(stderr, "Error during png creation\n");
    code = 1;
    goto finalise;
  }

  png_init_io(png_ptr, fp);

  // Write header (8 bit colour depth)
  png_set_IHDR(png_ptr, info_ptr, width, height,
      8, PNG_COLOR_TYPE_RGBA, PNG_INTERLACE_NONE,
      PNG_COMPRESSION_TYPE_BASE, PNG_FILTER_TYPE_BASE);

  png_write_info(png_ptr, info_ptr);

  // Quick graphics has the buffer as little-endian RGBA. Fix that up for png.
  transform = PNG_TRANSFORM_BGR | PNG_TRANSFORM_SWAP_ALPHA;
  rows = (png_bytep*)malloc(sizeof(png_bytep)*height);
  for (y=0 ; y<height; y++) {
    rows[y] = buffer+(y*pitch);
  }
  png_set_rows(png_ptr, info_ptr, rows);
  png_write_png(png_ptr, info_ptr, transform, NULL);

  finalise:
  if (fp != NULL) fclose(fp);
  if (rows != NULL) free(rows);
  if (info_ptr != NULL) png_free_data(png_ptr, info_ptr, PNG_FREE_ALL, -1);
  if (png_ptr != NULL) png_destroy_write_struct(&png_ptr, (png_infopp)NULL);

  return code;
}