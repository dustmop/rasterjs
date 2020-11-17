#include <png.h>
#include <stdlib.h>

int write_png(const char* savepath, unsigned char* buffer, int width, int height, int pitch) {
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
