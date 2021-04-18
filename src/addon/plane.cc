#include "type.h"
#include "plane.h"
#include "png_read_write.h"

#include "pixel_update_tasks.h"
#include "load_image.h"
#include "resources.h"

#include <cstdint>
#include <cmath> // round
#include <map> // std::map

using namespace Napi;

Napi::FunctionReference g_planeConstructor;

void Plane::InitClass(Napi::Env env, Napi::Object exports) {
  Napi::Function func = DefineClass(
      env,
      "Plane",
      {InstanceMethod("clear", &Plane::Clear),
       InstanceMethod("setSize", &Plane::SetSize),
       InstanceMethod("setColor", &Plane::SetColor),
       InstanceMethod("fillBackground", &Plane::FillBackground),
       InstanceMethod("retrieveTrueContent", &Plane::RetrieveTrueContent),
       InstanceMethod("saveTo", &Plane::SaveTo),
       InstanceMethod("saveImage", &Plane::SaveImage),
       InstanceMethod("assignRgbMap", &Plane::AssignRgbMap),
       InstanceMethod("clearRgbMap", &Plane::ClearRgbMap),
       InstanceMethod("addRgbMapEntry", &Plane::AddRgbMapEntry),
       InstanceMethod("putRect", &Plane::PutRect),
       InstanceMethod("putDot", &Plane::PutDot),
       InstanceMethod("putPolygon", &Plane::PutPolygon),
       InstanceMethod("putLine", &Plane::PutLine),
       InstanceMethod("putImage", &Plane::PutImage),
       InstanceMethod("putCircleFromArc", &Plane::PutCircleFromArc),
       InstanceMethod("putFrameMemory", &Plane::PutFrameMemory),
  });
  g_planeConstructor = Napi::Persistent(func);
  g_planeConstructor.SuppressDestruct();
}

Plane::Plane(const Napi::CallbackInfo& info) : Napi::ObjectWrap<Plane>(info) {
  Napi::Env env = info.Env();
  Napi::HandleScope scope(env);

  Napi::Object resObj = info[0].As<Napi::Object>();
  Resources* res = Napi::ObjectWrap<Resources>::Unwrap(resObj);

  this->rgbMapIndex = 0;
  this->rgbMapSize = 0;
  this->frontColor = 0xffffffff;
  this->backColor = 0;
  this->rowSize = 0;
  this->numElems = 0;
  this->buffer = NULL;
  this->width = 0;
  this->height = 0;
  this->needErase = false;
  this->res = res;
};

Napi::Object Plane::NewInstance(Napi::Env env, Napi::Value arg) {
  Napi::EscapableHandleScope scope(env);
  Napi::Object obj = g_planeConstructor.New({arg});
  return scope.Escape(napi_value(obj)).ToObject();
}

Napi::Value Plane::SetSize(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  this->width = info[0].As<Napi::Number>().Int32Value();
  this->height = info[1].As<Napi::Number>().Int32Value();
  return Napi::Number::New(env, 0);
}

void Plane::prepare() {
  // If buffer has not yet been allocated
  if (this->buffer == NULL) {
    if (this->width == 0) { this->width = 100; }
    if (this->height == 0) { this->height = 100; }
    // TODO: Make this larger? Test the performance of the change.
    this->rowSize = this->width;
    // Number of words.
    int numElems = this->height * this->rowSize;
    // Allocate the buffer.
    uint32_t* buffer = new uint32_t[numElems];
    // Assign.
    this->buffer = buffer;
    this->numElems = numElems;
    this->needErase = true;
  }
  if (!this->needErase) {
    return;
  }
  for (int n = 0; n < this->numElems; n++) {
    this->buffer[n] = this->backColor;
  }
  this->needErase = false;
}

void Plane::BeginFrame() {
  this->needErase = false;
}

void Plane::Finish() {
  this->prepare();
}

Napi::Value Plane::Clear(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (this->buffer) {
    delete[]this->buffer;
    this->buffer = NULL;
  }
  this->width = 0;
  this->height = 0;
  this->frontColor = 0xffffffff;
  this->backColor = 0;
  return Napi::Number::New(env, 0);
}


Napi::Value Plane::SaveTo(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!this->width || !this->height) {
    printf("cannot save file with zero size\n");
    exit(1);
  }

  Napi::String savepath = info[0].ToString();
  int pitch = this->rowSize*4;
  write_png(savepath.Utf8Value().c_str(),
            (unsigned char*)this->buffer,
            this->width,
            this->height,
            pitch);
  return Napi::Number::New(env, 0);
}

#define TAU 6.283

#define OPAQUE 255

Napi::Value Plane::AssignRgbMap(const Napi::CallbackInfo& info) {
  Napi::Value elem = info[0];
  Napi::Object list = elem.ToObject();
  Napi::Value list_length = list.Get("length");

  int num = list_length.As<Napi::Number>().Int32Value();
  this->rgbMapIndex = num;
  this->rgbMapSize = num;

  for (int i = 0; i < num; i++) {
    elem = list[uint32_t(i)];
    int val = elem.As<Napi::Number>().Int32Value();
    // Store values as little-endian RGBA.
    this->rgbMap[i] = val * 0x100 + 0xff;
  }

  return info.Env().Null();
}

Napi::Value Plane::ClearRgbMap(const Napi::CallbackInfo& info) {
  this->rgbMapIndex = 0;
  this->rgbMapSize = 0;
  return info.Env().Null();
}

Napi::Value Plane::AddRgbMapEntry(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  Napi::Value val = info[0];
  int num = val.As<Napi::Number>().Int32Value();
  int size = this->rgbMapSize;
  int color = num * 0x100 + 0xff;
  for (int i = 0; i < size; i++) {
    if (this->rgbMap[i] == color) {
      return Napi::Number::New(env, i);
    }
  }
  // Add it to the map
  int index = this->rgbMapIndex;
  this->rgbMap[index] = color;
  if (size < 0x100) {
    this->rgbMapSize++;
  }
  this->rgbMapIndex = (this->rgbMapIndex + 1) % 0x100;
  return Napi::Number::New(env, index);
}

Napi::Value Plane::RetrieveTrueContent(const Napi::CallbackInfo& info) {
  if (!this->buffer) {
    return info.Env().Null();
  }

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

  // Convert rgb colors in buffer into pixel data, and a collection
  // of all unique colors used
  for (int y = 0; y < y_size; y++) {
    for (int x = 0; x < x_size; x++) {
      rgb_val = this->buffer[x + y*row_size];
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

Napi::Value Plane::SetColor(const Napi::CallbackInfo& info) {
  Napi::Value val = info[0];
  int color = val.As<Napi::Number>().Int32Value();

  uint32_t rgb = this->rgbMap[color % this->rgbMapSize];
  this->frontColor = rgb;

  return info.Env().Null();
}

Napi::Value Plane::PutRect(const Napi::CallbackInfo& info) {
  this->prepare();

  // TODO: Validate length of parameters, all should be numbers

  Napi::Value xval = info[0];
  Napi::Value yval = info[1];
  Napi::Value wval = info[2];
  Napi::Value hval = info[3];
  bool fill = info[4].ToBoolean().Value();

  int x = round(xval.As<Napi::Number>().FloatValue());
  int y = round(yval.As<Napi::Number>().FloatValue());
  int w = round(wval.As<Napi::Number>().FloatValue());
  int h = round(hval.As<Napi::Number>().FloatValue());

  uint32_t color = this->frontColor;
  GfxTarget target;
  this->fillTarget(&target);
  putRect(&target, x, y, x+w, y+h, fill, color);

  Napi::Env env = info.Env();
  return Napi::Number::New(env, 0);
}

Napi::Value Plane::PutDot(const Napi::CallbackInfo& info) {
  this->prepare();

  Napi::Value xval = info[0];
  Napi::Value yval = info[1];

  int x = round(xval.As<Napi::Number>().FloatValue());
  int y = round(yval.As<Napi::Number>().FloatValue());

  uint32_t color = this->frontColor;
  this->buffer[x + y*this->rowSize] = color;

  return info.Env().Null();
}

Napi::Value Plane::PutLine(const Napi::CallbackInfo& info) {
  this->prepare();

  Napi::Value xval  = info[0];
  Napi::Value yval  = info[1];
  Napi::Value x1val = info[2];
  Napi::Value y1val = info[3];
  Napi::Value ccval = info[4];

  int x0 = round(xval.As<Napi::Number>().FloatValue());
  int y0 = round(yval.As<Napi::Number>().FloatValue());
  int x1 = round(x1val.As<Napi::Number>().FloatValue());
  int y1 = round(y1val.As<Napi::Number>().FloatValue());
  int connectCorners = ccval.As<Napi::Number>().Int32Value();

  uint32_t color = this->frontColor;

  PointList point_list;
  point_list.push_back(Point(x0, y0));
  point_list.push_back(Point(x1, y1));

  GfxTarget target;
  this->fillTarget(&target);
  putLine(&target, point_list, color, connectCorners);

  Napi::Env env = info.Env();
  return Napi::Number::New(env, 0);
}

Napi::Value Plane::PutPolygon(const Napi::CallbackInfo& info) {
  this->prepare();

  if (info.Length() != 4) {
    printf("expected 4 arguments to this function\n");
    return info.Env().Null();
  }

  int baseX = info[0].ToNumber().Int32Value();
  int baseY = info[1].ToNumber().Int32Value();

  Napi::Value val = info[2];
  if (val.IsObject()) {
    if (!val.IsArray()) {
      printf("expected Val to be Array\n");
      return info.Env().Null();
    }
    Napi::Object parameter_list = val.ToObject();
    Napi::Value parameter_length = parameter_list.Get("length");
    int num_points = parameter_length.As<Napi::Number>().Int32Value();

    PointList point_list;
    for (int i = 0; i < num_points; i++) {
      Napi::Value elem = parameter_list[uint32_t(i)];
      // TODO: Validate this is an object
      Napi::Object pair = elem.ToObject();
      // TODO: validate length is 2
      // TODO: handle x,y object, instead of just array
      Napi::Value first = pair[uint32_t(0)];
      Napi::Value second = pair[uint32_t(1)];
      int firstNum = round(first.As<Napi::Number>().FloatValue());
      int secondNum = round(second.As<Napi::Number>().FloatValue());
      point_list.push_back(Point(firstNum + baseX, secondNum + baseY));
    }

    bool fill = info[3].ToBoolean().Value();
    uint32_t color = this->frontColor;
    GfxTarget target;
    this->fillTarget(&target);
    if (fill) {
      putPolygonFill(&target, point_list, color);
    } else {
      putPolygonOutline(&target, point_list, color);
    }
  }

  return info.Env().Null();
}

Napi::Value Plane::FillBackground(const Napi::CallbackInfo& info) {
  Napi::Value val = info[0];
  int color = round(val.As<Napi::Number>().FloatValue());

  uint32_t rgb = this->rgbMap[color % this->rgbMapSize];
  this->backColor = rgb;

  // Don't allocate just now, because maybe the size hasn't been set yet.
  // Just record the color.
  // TODO: Planes should support a "background" color, perhaps require it
  // to be 0. That will be used as the transparent color when planes are
  // merged.
  this->needErase = true;

  return info.Env().Null();
}

Napi::Value Plane::PutImage(const Napi::CallbackInfo& info) {
  this->prepare();

  Napi::Object imgObj = info[0].ToObject();
  int baseX = info[1].ToNumber().Int32Value();
  int baseY = info[2].ToNumber().Int32Value();

  Napi::Value imgIdval = imgObj["id"];
  int imgId = imgIdval.ToNumber().Int32Value();

  Image* img_struct = this->res->getImage(imgId);
  if (!img_struct) {
    printf("invalid image id: %d\n", imgId);
    return info.Env().Null();
  }

  int imgLeft, imgTop;
  int imgWidth, imgHeight, imgPitch;
  uint8* data = NULL;
  imgLeft = imgTop = 0;
  GetPng(img_struct, &imgWidth, &imgHeight, &data);
  imgPitch = imgWidth;

  Napi::Value sliceval = imgObj["slice"];
  if (sliceval.IsObject()) {
    if (sliceval.IsArray()) {
      Napi::Object slice = sliceval.ToObject();
      Napi::Value val;
      val = slice[uint32_t(0)];
      int slicex = val.ToNumber().Int32Value();
      val = slice[uint32_t(1)];
      int slicey = val.ToNumber().Int32Value();
      val = slice[uint32_t(2)];
      int slicew = val.ToNumber().Int32Value();
      val = slice[uint32_t(3)];
      int sliceh = val.ToNumber().Int32Value();
      imgLeft = slicex;
      imgTop = slicey;
      imgWidth = slicew;
      imgHeight = sliceh;
    }
  }

  for (int y = imgTop; y < imgHeight; y++) {
    for (int x = imgLeft; x < imgWidth; x++) {
      uint8 r = data[(y*imgPitch+x)*4+0];
      uint8 g = data[(y*imgPitch+x)*4+1];
      uint8 b = data[(y*imgPitch+x)*4+2];
      uint8 a = data[(y*imgPitch+x)*4+3];
      if (a > 0x80) {
        uint32_t color = (r * 0x1000000 +
                          g * 0x10000 +
                          b * 0x100 +
                          0xff);
        int pixelX = x + baseX;
        int pixelY = y + baseY;
        if (pixelX >= 0 && pixelX < this->width &&
            pixelY >= 0 && pixelY < this->height) {
          this->buffer[pixelX + pixelY*this->rowSize] = color;
        }
      }
    }
  }

  return info.Env().Null();
}

Napi::Value Plane::PutCircleFromArc(const Napi::CallbackInfo& info) {
  this->prepare();

  int baseX = info[0].ToNumber().Int32Value();
  int baseY = info[1].ToNumber().Int32Value();

  // Num points will always be assigned, but num inner is optional.
  int num_points = -1;
  int num_inner = -1;

  // Validate that first parameter is an array of pairs.
  Napi::Value val = info[2];
  if (!val.IsObject()) {
    printf("expected Val to be Object\n");
    return info.Env().Null();
  }
  if (!val.IsArray()) {
    printf("expected Val to be Array\n");
    return info.Env().Null();
  }

  // Get list of pairs and its length.
  Napi::Object parameter_list = val.ToObject();
  Napi::Value parameter_length = parameter_list.Get("length");
  num_points = parameter_length.As<Napi::Number>().Int32Value();

  // Optionally get the second list of pairs, and if so, assign num inner.
  Napi::Value inner = info[3];
  Napi::Object inner_list;
  if (inner.IsObject()) {
    if (inner.IsArray()) {
      inner_list = inner.ToObject();
      Napi::Value inner_length = inner_list.Get("length");
      num_inner = inner_length.As<Napi::Number>().Int32Value();
    }
  }

  bool fill = info[4].ToBoolean().Value();
  uint32_t color = this->frontColor;
  GfxTarget target;
  this->fillTarget(&target);

  for (int i = 0; i < num_points; i++) {
    Napi::Value elem = parameter_list[uint32_t(i)];
    // TODO: Validate this is an object
    Napi::Object pair = elem.ToObject();
    // TODO: validate length is 2
    Napi::Value first = pair[uint32_t(0)];
    Napi::Value second = pair[uint32_t(1)];
    int a = first.As<Napi::Number>().Int32Value();
    int b = second.As<Napi::Number>().Int32Value();

    int L = -1;
    if (i < num_inner) {
      // If inner list exists, and we're inside it, get the Left value.
      Napi::Value elem = inner_list[uint32_t(i)];
      Napi::Object pair = elem.ToObject();
      Napi::Value left = pair[uint32_t(0)];
      L = left.As<Napi::Number>().Int32Value();
    } else if (num_inner != -1) {
      // If inner list exists, and we're past it, Left is the diagonal border.
      L = b - 2;
    }

    if (fill) {
      L = 0;
    } else if (L == -1) {
      // If no width given, set a width of 1
      L = a;
    } else {
      L = L + 2;
    }
    putRange(&target, baseX + a, baseY + b, baseX + L, baseY + b, color);
    putRange(&target, baseX - a, baseY + b, baseX - L, baseY + b, color);
    putRange(&target, baseX + a, baseY - b, baseX + L, baseY - b, color);
    putRange(&target, baseX - a, baseY - b, baseX - L, baseY - b, color);
    putRange(&target, baseX + b, baseY + a, baseX + b, baseY + L, color);
    putRange(&target, baseX - b, baseY + a, baseX - b, baseY + L, color);
    putRange(&target, baseX + b, baseY - a, baseX + b, baseY - L, color);
    putRange(&target, baseX - b, baseY - a, baseX - b, baseY - L, color);
  }

  Napi::Env env = info.Env();
  return Napi::Number::New(env, 0);
}

Napi::Value Plane::PutFrameMemory(const Napi::CallbackInfo& info) {
  this->prepare();

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

  for (int y = 0; y < this->height; y++) {
    for (int x = 0; x < this->width; x++) {
      unsigned char color = data[x + y*this->rowSize];
      uint32_t rgb = this->rgbMap[color % this->rgbMapSize];
      this->buffer[x + y*this->rowSize] = rgb;
    }
  }

  Napi::Env env = info.Env();
  return Napi::Number::New(env, 0);
}

Napi::Value Plane::SaveImage(const Napi::CallbackInfo& info) {
  this->prepare();

  if (info.Length() < 2) {
    printf("SaveImage needs 2 params");
    exit(1);
  }

  std::string outFilename = info[0].ToString().Utf8Value();
  Napi::Object obj = info[1].ToObject();

  Napi::Value valImg   = obj["img"];
  Napi::Value valId    = obj["id"];
  Napi::Value valSlice = obj["slice"];
  Napi::Object objSlice = valSlice.ToObject();

  int imgId = valImg.ToNumber().Int32Value();
  Image* img_struct = this->res->getImage(imgId);
  if (!img_struct) {
    printf("invalid image id: %d\n", imgId);
    return info.Env().Null();
  }

  int width, height;
  uint8* data = NULL;
  GetPng(img_struct, &width, &height, &data);

  Napi::Value valX = objSlice["x"];
  Napi::Value valY = objSlice["y"];
  Napi::Value valW = objSlice["w"];
  Napi::Value valH = objSlice["h"];

  int x = valX.ToNumber().Int32Value();
  int y = valY.ToNumber().Int32Value();
  int w = valW.ToNumber().Int32Value();
  int h = valH.ToNumber().Int32Value();

  unsigned char* segment = (unsigned char*)malloc(4 * w * h);
  for (int i = 0; i < h; i++) {
    for (int j = 0; j < w; j++) {
      int m = (i*w + j) * 4;
      int n = (((y+i)*width) + (x+j)) * 4;
      segment[m + 0] = data[n + 3];
      segment[m + 1] = data[n + 2];
      segment[m + 2] = data[n + 1];
      segment[m + 3] = data[n + 0];
    }
  }

  write_png(outFilename.c_str(), segment, w, h, w*4);

  free(segment);

  Napi::Env env = info.Env();
  return Napi::Number::New(env, 0);
}

void Plane::fillTarget(GfxTarget* t) {
  t->buffer  = this->buffer;
  t->width   = this->width;
  t->height  = this->height;
  t->rowSize = this->rowSize;
}
