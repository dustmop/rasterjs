#include "type.h"
#include "raw_buffer.h"
#include "image_load_save.h"
#include "resources.h"

#include <cstdint>
#include <cmath> // round
#include <map> // std::map

using namespace Napi;

Napi::FunctionReference g_planeConstructor;

bool isInt(float f);

#define WHITE_32BIT 0xffffffff
#define BLACK_32BIT 0x000000ff

void RawBuffer::InitClass(Napi::Env env, Napi::Object exports) {
  Napi::Function func = DefineClass(
      env,
      "RawBuffer",
      {InstanceMethod("clear", &RawBuffer::Clear),
       InstanceMethod("setSize", &RawBuffer::SetSize),
       InstanceMethod("setColor", &RawBuffer::SetColor),
       InstanceMethod("fillBackground", &RawBuffer::FillBackground),
       InstanceMethod("retrieveTrueContent", &RawBuffer::RetrieveTrueContent),
       InstanceMethod("useColors", &RawBuffer::UseColors),
       InstanceMethod("putSequence", &RawBuffer::PutSequence),
       InstanceMethod("putImage", &RawBuffer::PutImage),
       InstanceMethod("putFrameMemory", &RawBuffer::PutFrameMemory),
       InstanceMethod("putColorChange", &RawBuffer::PutColorChange),
       InstanceAccessor<&RawBuffer::GetWidth>("width"),
       InstanceAccessor<&RawBuffer::GetHeight>("height"),
       InstanceMethod("rawData", &RawBuffer::RawData),
  });
  g_planeConstructor = Napi::Persistent(func);
  g_planeConstructor.SuppressDestruct();
}

RawBuffer::RawBuffer(const Napi::CallbackInfo& info) : Napi::ObjectWrap<RawBuffer>(info) {
  Napi::Env env = info.Env();
  Napi::HandleScope scope(env);

  this->frontColor = WHITE_32BIT;
  this->backColor = BLACK_32BIT;
  this->rowSize = 0;
  this->numElems = 0;
  this->rawBuff = NULL;
  this->width = 0;
  this->height = 0;
  this->needErase = true;
};

Napi::Object RawBuffer::NewInstance(Napi::Env env, Napi::Value arg) {
  Napi::EscapableHandleScope scope(env);
  Napi::Object obj = g_planeConstructor.New({arg});
  return scope.Escape(napi_value(obj)).ToObject();
}

Napi::Value RawBuffer::SetSize(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  this->width = info[0].As<Napi::Number>().Int32Value();
  this->height = info[1].As<Napi::Number>().Int32Value();
  return Napi::Number::New(env, 0);
}

Napi::Value RawBuffer::GetWidth(const Napi::CallbackInfo &info) {
  Napi::Env env = info.Env();
  return Napi::Number::New(env, this->width);
}

Napi::Value RawBuffer::GetHeight(const Napi::CallbackInfo &info) {
  Napi::Env env = info.Env();
  return Napi::Number::New(env, this->height);
}

Napi::Value RawBuffer::RawData(const Napi::CallbackInfo &info) {
  Napi::Env env = info.Env();
  this->prepare(env);
  napi_value result;
  napi_get_reference_value(env, this->arrayBuff, &result);
  return Napi::Value(env, result);
}

void RawBuffer::prepare(const Napi::Env& env) {
  // If buffer has not yet been allocated
  if (this->rawBuff == NULL) {
    if (this->width == 0) { this->width = 100; }
    if (this->height == 0) { this->height = 100; }
    // TODO: Make this larger? Test the performance of the change.
    this->rowSize = this->width;
    // Number of words.
    int numElems = this->height * this->rowSize;
    // Allocate the buffer.
    uint32_t* buffer = new uint32_t[numElems];
    // Assign.
    this->rawBuff = buffer;
    this->numElems = numElems;
    this->needErase = true;
    // The js available object that wraps the raw buffer
    int numBytes = numElems * 4;
    Napi::Object array = Napi::ArrayBuffer::New(env, this->rawBuff, numBytes);
    napi_create_reference(env, array, 1, &this->arrayBuff);
  }
  if (!this->needErase) {
    return;
  }

  for (int n = 0; n < this->numElems; n++) {
    this->rawBuff[n] = this->backColor;
  }
  this->needErase = false;
}

Napi::Value RawBuffer::Clear(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (this->rawBuff) {
    delete[]this->rawBuff;
    this->rawBuff = NULL;
    napi_delete_reference(env, this->arrayBuff);
  }
  this->width = 0;
  this->height = 0;
  this->frontColor = WHITE_32BIT;
  this->backColor = BLACK_32BIT;
  return Napi::Number::New(env, 0);
}

#define TAU 6.283

#define OPAQUE 255

Napi::Value RawBuffer::UseColors(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  Napi::Value val = info[0];

  Napi::Object colorSet = val.ToObject();
  Napi::Value rgbMapVal = colorSet.Get("rgbMap");

  Napi::Value colorSetVal(env, val);
  napi_create_reference(env, colorSetVal, 1, &this->colors);
  return info.Env().Null();
}

Napi::Value RawBuffer::RetrieveTrueContent(const Napi::CallbackInfo& info) {
  this->prepare(info.Env());

  int x_size = this->width;
  int y_size = this->height;
  int row_size = this->rowSize;
  uint32_t rgb_val;

  // u8 valued pixel data to be filled from the buffer
  std::vector<u8_t> pixel_data;
  // Map from rgb values to u8 values
  std::map<uint32_t, u8_t> color_use_lookup;
  u8_t num_colors = 0;
  // match the buffer
  pixel_data.resize(y_size * x_size);

  int rgbMapSize;
  this->loadRgbMap(info, &rgbMapSize);

  // Read the already existing color set.
  for (int i = 0; i < rgbMapSize; i++) {
    rgb_val = this->rgbMap[i];
    color_use_lookup[rgb_val] = i;
    num_colors++;
  }

  // Convert rgb colors in buffer into pixel data, and a collection
  // of all unique colors used
  for (int y = 0; y < y_size; y++) {
    for (int x = 0; x < x_size; x++) {
      rgb_val = this->rawBuff[x + y*row_size];
      auto it = color_use_lookup.find(rgb_val);
      if (it == color_use_lookup.end()) {
        color_use_lookup[rgb_val] = num_colors;
        pixel_data[x + y*row_size] = num_colors;
        num_colors++;
      } else {
        pixel_data[x + y*row_size] = it->second;
      }
    }
  }

  // Merge 32-bit rgb values from color usage table to make true color list
  std::vector<uint32_t> true_colors;
  true_colors.resize(num_colors);
  for (auto it = color_use_lookup.begin(); it != color_use_lookup.end(); it++) {
    true_colors[it->second] = it->first;
  }

  Napi::Value elem = info[0];
  Napi::Object container = elem.ToObject();
  Napi::Value paletteval = container.Get("palette");
  Napi::Value bufferval = container.Get("buffer");

  // TODO: Type check IsArray() for these
  // Palette is a list of true colors used by image
  Napi::Object palette = paletteval.ToObject();
  // Buffer is the u8 values in the plane
  Napi::Object buffer = bufferval.ToObject();

  for (size_t i = 0; i < pixel_data.size(); i++) {
    buffer[i] = pixel_data[i];
  }
  for (size_t i = 0; i < true_colors.size(); i++) {
    palette[i] = true_colors[i];
  }
  // Assign pitch of image
  Napi::Env env = info.Env();
  container.Set("pitch", Napi::Number::New(env, row_size));
  return info.Env().Null();
}

Napi::Value RawBuffer::SetColor(const Napi::CallbackInfo& info) {
  Napi::Value val = info[0];
  int color = val.As<Napi::Number>().Int32Value();

  int rgbMapSize;
  this->loadRgbMap(info, &rgbMapSize);

  uint32_t rgb = this->rgbMap[color % rgbMapSize];
  this->frontColor = rgb;

  return info.Env().Null();
}

Napi::Value RawBuffer::PutSequence(const Napi::CallbackInfo& info) {
  this->prepare(info.Env());

  uint32_t color = this->frontColor;

  Napi::Value elem = info[0];
  Napi::Object list = elem.ToObject();
  Napi::Value list_length = list.Get("length");
  int num = list_length.As<Napi::Number>().Int32Value();

  for (int i = 0; i < num; i++) {
      elem = list[uint32_t(i)];
      Napi::Object obj = elem.ToObject();
      Napi::Value obj_length = obj.Get("length");
      int len = obj_length.As<Napi::Number>().Int32Value();
      if (len == 2) {
          Napi::Object pair = obj;
          Napi::Value first = pair[uint32_t(0)];
          Napi::Value second = pair[uint32_t(1)];
          int x = first.As<Napi::Number>().Int32Value();
          int y = second.As<Napi::Number>().Int32Value();
          if (x >= 0 && x < this->width && y >= 0 && y < this->height) {
            this->rawBuff[x + y*this->rowSize] = color;
          }
      } else if (len == 4) {
          Napi::Object range = obj;
          Napi::Value first = range[uint32_t(0)];
          Napi::Value second = range[uint32_t(1)];
          Napi::Value third = range[uint32_t(2)];
          Napi::Value fourth = range[uint32_t(3)];
          int x0 = first.As<Napi::Number>().Int32Value();
          int x1 = second.As<Napi::Number>().Int32Value();
          int y0 = third.As<Napi::Number>().Int32Value();
          int y1 = fourth.As<Napi::Number>().Int32Value();
          this->putRange(x0, y0, x1, y1, color);
      }
  }

  Napi::Env env = info.Env();
  return Napi::Number::New(env, 0);
}

Napi::Value RawBuffer::FillBackground(const Napi::CallbackInfo& info) {
  Napi::Value val = info[0];
  int color = round(val.As<Napi::Number>().FloatValue());

  int rgbMapSize;
  this->loadRgbMap(info, &rgbMapSize);
  uint32_t rgb = this->rgbMap[color % rgbMapSize];
  this->backColor = rgb;

  // Don't allocate just now, because maybe the size hasn't been set yet.
  // Just record the color.
  // TODO: Planes should support a "background" color, perhaps require it
  // to be 0. That will be used as the transparent color when planes are
  // merged.
  this->needErase = true;

  return info.Env().Null();
}

Napi::Value RawBuffer::PutImage(const Napi::CallbackInfo& info) {
  this->prepare(info.Env());

  Napi::Object imgObj = info[0].ToObject();
  int baseX = info[1].ToNumber().Int32Value();
  int baseY = info[2].ToNumber().Int32Value();

  int top = Napi::Value(imgObj["top"]).ToNumber().Int32Value();
  int left = Napi::Value(imgObj["left"]).ToNumber().Int32Value();
  int width = Napi::Value(imgObj["width"]).ToNumber().Int32Value();
  int height = Napi::Value(imgObj["height"]).ToNumber().Int32Value();
  int pitch = Napi::Value(imgObj["pitch"]).ToNumber().Int32Value();

  Napi::Value dataObj = imgObj["data"];
  Napi::ArrayBuffer buffer = dataObj.As<Napi::TypedArray>().ArrayBuffer();
  uint8* data = (uint8*)buffer.Data();

  for (int y = top; y < height; y++) {
    for (int x = left; x < width; x++) {
      uint8 r = data[(y*pitch+x)*4+0];
      uint8 g = data[(y*pitch+x)*4+1];
      uint8 b = data[(y*pitch+x)*4+2];
      uint8 a = data[(y*pitch+x)*4+3];
      if (a > 0x80) {
        uint32_t color = (r * 0x1000000 +
                          g * 0x10000 +
                          b * 0x100 +
                          0xff);
        int pixelX = x + baseX;
        int pixelY = y + baseY;
        if (pixelX >= 0 && pixelX < this->width &&
            pixelY >= 0 && pixelY < this->height) {
          this->rawBuff[pixelX + pixelY*this->rowSize] = color;
        }
      }
    }
  }

  return info.Env().Null();
}

Napi::Value RawBuffer::PutFrameMemory(const Napi::CallbackInfo& info) {
  this->prepare(info.Env());

  if (info.Length() < 1) {
    printf("PutFrameMemory needs 1 param");
    exit(1);
  }
  if (!info[0].IsTypedArray()) {
    printf("PutFrameMemory needs TypedArray");
    exit(1);
  }

  Napi::ArrayBuffer buffer = info[0].As<Napi::TypedArray>().ArrayBuffer();
  unsigned char* data = (unsigned char*)buffer.Data();

  int rgbMapSize;
  this->loadRgbMap(info, &rgbMapSize);

  for (int y = 0; y < this->height; y++) {
    for (int x = 0; x < this->width; x++) {
      unsigned char color = data[x + y*this->rowSize];
      uint32_t rgb = this->rgbMap[color % rgbMapSize];
      this->rawBuff[x + y*this->rowSize] = rgb;
    }
  }

  Napi::Env env = info.Env();
  return Napi::Number::New(env, 0);
}

Napi::Value retError(const Napi::CallbackInfo& info, const char* msg) {
  printf("%s\n", msg);
  return info.Env().Null();
}

Napi::Value RawBuffer::PutColorChange(const Napi::CallbackInfo& info) {
  Napi::Value val = info[0];
  int nextRgb = val.As<Napi::Number>().Int32Value();

  val = info[1];
  int color = val.As<Napi::Number>().Int32Value();

  val = info[2];
  int pitch = val.As<Napi::Number>().Int32Value();

  val = info[3];
  if (!val.IsObject()) {
    return retError(info, "arg[3] needs to be an object");
  }
  if (!val.IsArray()) {
    return retError(info, "arg[3] needs to be an array");
  }

  Napi::Object parameter_list = val.ToObject();
  Napi::Value parameter_length = parameter_list.Get("length");
  int numElems = parameter_length.As<Napi::Number>().Int32Value();

  this->rgbMap[color] = nextRgb;

  for (int i = 0; i < numElems; i++) {
    Napi::Value elem = parameter_list[uint32_t(i)];
    int imageIndex = elem.As<Napi::Number>().Int32Value();
    this->rawBuff[imageIndex] = nextRgb;
  }
  return info.Env().Null();
}

bool isInt(float f) {
  double whole;
  double fract = modf(double(f), &whole);
  return fract == 0.0;
}

void RawBuffer::putRange(int x0, int y0, int x1, int y1, uint32_t color) {
  int tmp;
  if (x0 > x1) {
    tmp = x0;
    x0 = x1;
    x1 = tmp;
  }
  if (y0 > y1) {
    tmp = y0;
    y0 = y1;
    y1 = tmp;
  }
  if (x0 == x1) {
    if (x0 < 0 || x1 >= this->width) {
      return;
    }
    if (y0 < 0) {
      y0 = 0;
    }
    if (y1 >= this->height) {
      y1 = this->height - 1;
    }
    int x = x0;
    for (int y = y0; y <= y1; y++) {
      this->rawBuff[x + y*this->rowSize] = color;
    }
  } else {
    if (y0 < 0 || y1 >= this->height) {
      return;
    }
    if (x0 < 0) {
      x0 = 0;
    }
    if (x1 >= this->width) {
      x1 = this->width - 1;
    }
    int y = y0;
    for (int x = x0; x <= x1; x++) {
      this->rawBuff[x + y*this->rowSize] = color;
    }
  }
}

void RawBuffer::loadRgbMap(const Napi::CallbackInfo &info, int* outSize) {
  Napi::Env env = info.Env();

  napi_value result;
  napi_get_reference_value(env, this->colors, &result);
  Napi::Value colorsVal(env, result);

  Napi::Object colorsObj = colorsVal.ToObject();
  Napi::Value rgbMapVal = colorsObj.Get("rgbMap");
  Napi::Object rgbMapList = rgbMapVal.ToObject();
  Napi::Value length = rgbMapList.Get("length");

  int size = length.As<Napi::Number>().Int32Value();
  *outSize = size;

  for (int i = 0; i < size; i++) {
    Napi::Value elem = rgbMapList[uint32_t(i)];
    int val = elem.As<Napi::Number>().Int32Value();
    // Store values as little-endian RGBA.
    this->rgbMap[i] = val * 0x100 + 0xff;
  }
}
