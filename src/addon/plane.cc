#include "type.h"
#include "gfx_types.h"
#include "plane.h"
#include "png_read_write.h"

#include "polygon.h"
#include "line.h"
#include "rect.h"
#include "load_image.h"

#include <cmath> // round
#include <map> // std::map

using namespace Napi;

Napi::FunctionReference g_planeConstructor;

void Plane::InitClass(Napi::Env env, Napi::Object exports) {
  Napi::Function func = DefineClass(
      env,
      "Plane",
      {InstanceMethod("resetState", &Plane::ResetState),
       InstanceMethod("setSize", &Plane::SetSize),
       InstanceMethod("setColor", &Plane::SetColor),
       InstanceMethod("fillBackground", &Plane::FillBackground),
       InstanceMethod("fillColorizedImage", &Plane::FillColorizedImage),
       InstanceMethod("saveTo", &Plane::SaveTo),
       InstanceMethod("saveImage", &Plane::SaveImage),
       InstanceMethod("assignRgbMapping", &Plane::AssignRgbMapping),
       InstanceMethod("putRect", &Plane::PutRect),
       InstanceMethod("putPoint", &Plane::PutPoint),
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

  this->rgb_map_length = 0;
  this->frontColor = 0xffffffff;
  this->backColor = 0;
  this->drawTarget = NULL;
  this->allocTarget = NULL;
  this->viewWidth = 0;
  this->viewHeight = 0;
};

Napi::Object Plane::NewInstance(Napi::Env env, Napi::Value arg) {
  Napi::EscapableHandleScope scope(env);
  Napi::Object obj = g_planeConstructor.New({arg});
  return scope.Escape(napi_value(obj)).ToObject();
}

// Drawing globals, used for putLine and putPolygon
int point_x[16];
int point_y[16];

Napi::Value Plane::SetSize(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  this->viewWidth = info[0].As<Napi::Number>().Int32Value();
  this->viewHeight = info[1].As<Napi::Number>().Int32Value();
  return Napi::Number::New(env, 0);
}

GfxTarget* Plane::instantiateDrawTarget() {
  if (!this->allocTarget) {
    this->allocTarget = (GfxTarget*)malloc(sizeof(GfxTarget));
    if (this->allocTarget == NULL) {
      printf("allocTarget failed to malloc\n");
      exit(1);
    }
    if (!this->viewWidth || !this->viewHeight) {
      printf("cannot allocate a target with zero size\n");
      exit(1);
    }
    this->allocTarget->x_size = this->viewWidth;
    this->allocTarget->y_size = this->viewHeight;
    this->allocTarget->pitch = this->viewWidth * 4;
    this->allocTarget->capacity = this->allocTarget->pitch * this->viewHeight;
    this->allocTarget->buffer = (uint32_t*)malloc(this->allocTarget->capacity);
    if (this->allocTarget->buffer == NULL) {
      printf("allocTarget.buffer failed to malloc\n");
      exit(1);
    }
  }
  uint32_t* colors = (uint32_t*)this->allocTarget->buffer;
  for (int n = 0; n < this->allocTarget->capacity / 4; n++) {
    colors[n] = this->backColor;
  }
  return this->allocTarget;
}

void putRange(GfxTarget* target, int x0, int y0, int x1, int y1, uint32_t color);

Napi::Value Plane::ResetState(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (this->allocTarget) {
    free(this->allocTarget);
    this->allocTarget = NULL;
    this->drawTarget = NULL;
  }
  return Napi::Number::New(env, 0);
}

Napi::Value Plane::SaveTo(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!viewWidth || !viewHeight) {
    printf("cannot save file with zero size\n");
    exit(1);
  }

  Napi::String savepath = info[0].ToString();
  write_png(savepath.Utf8Value().c_str(),
            (unsigned char*)this->drawTarget->buffer,
            this->viewWidth,
            this->viewHeight,
            this->drawTarget->pitch);
  return Napi::Number::New(env, 0);
}

#define TAU 6.283

#define OPAQUE 255

Napi::Value Plane::AssignRgbMapping(const Napi::CallbackInfo& info) {
  Napi::Value elem = info[0];
  Napi::Object list = elem.ToObject();
  Napi::Value list_length = list.Get("length");

  int num = list_length.As<Napi::Number>().Int32Value();
  this->rgb_map_length = num;

  for (int i = 0; i < num; i++) {
    elem = list[uint32_t(i)];
    int val = elem.As<Napi::Number>().Int32Value();
    // Store values as little-endian RGBA.
    this->rgb_map[i] = val * 0x100 + 0xff;
  }

  return info.Env().Null();
}

Napi::Value Plane::FillColorizedImage(const Napi::CallbackInfo& info) {
  GfxTarget* target = this->drawTarget;
  int x_size = target->x_size;
  int y_size = target->y_size;
  int pitch = target->pitch;
  uint32_t color;

  std::vector<u8_t> pixel_data;
  std::map<uint32_t, u8_t> color_lookup;
  u8_t index_value = 0;
  pixel_data.resize(y_size * pitch/4);

  for (int y = 0; y < y_size; y++) {
    for (int x = 0; x < x_size; x++) {
      color = this->drawTarget->buffer[x + y*pitch/4];
      auto it = color_lookup.find(color);
      if (it == color_lookup.end()) {
        color_lookup[color] = index_value;
        pixel_data[x + y*pitch/4] = index_value;
        index_value++;
      } else {
        pixel_data[x + y*pitch/4] = it->second;
      }
    }
  }

  std::vector<uint32_t> color_palette;
  color_palette.resize(index_value);
  for (auto it = color_lookup.begin(); it != color_lookup.end(); it++) {
    color_palette[it->second] = it->first;
  }

  Napi::Value elem = info[0];
  Napi::Object container = elem.ToObject();
  Napi::Value paletteval = container.Get("palette");
  Napi::Value bufferval = container.Get("buffer");

  // TODO: Type check IsArray() for these
  Napi::Object palette = paletteval.ToObject();
  Napi::Object buffer = bufferval.ToObject();

  for (size_t i = 0; i < pixel_data.size(); i++) {
    buffer[i] = pixel_data[i];
  }
  for (size_t i = 0; i < color_palette.size(); i++) {
    palette[i] = color_palette[i];
  }

  return info.Env().Null();
}

Napi::Value Plane::SetColor(const Napi::CallbackInfo& info) {
  Napi::Value val = info[0];
  int color = val.As<Napi::Number>().Int32Value();

  uint32_t rgb = this->rgb_map[color % this->rgb_map_length];
  this->frontColor = rgb;

  return info.Env().Null();
}

Napi::Value Plane::PutRect(const Napi::CallbackInfo& info) {
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

  if (!this->drawTarget) {
    this->drawTarget = instantiateDrawTarget();
  }

  uint32_t color = this->frontColor;
  drawRect(this->drawTarget, x, y, x+w, y+h, fill, color);

  Napi::Env env = info.Env();
  return Napi::Number::New(env, 0);
}

Napi::Value Plane::PutPoint(const Napi::CallbackInfo& info) {
  Napi::Value xval = info[0];
  Napi::Value yval = info[1];

  int x = round(xval.As<Napi::Number>().FloatValue());
  int y = round(yval.As<Napi::Number>().FloatValue());

  uint32_t color = this->frontColor;
  if (!this->drawTarget) {
    this->drawTarget = instantiateDrawTarget();
  }
  this->drawTarget->buffer[x + y*this->drawTarget->pitch/4] = color;

  return info.Env().Null();
}

Napi::Value Plane::PutLine(const Napi::CallbackInfo& info) {
  Napi::Value xval  = info[0];
  Napi::Value yval  = info[1];
  Napi::Value x1val = info[2];
  Napi::Value y1val = info[3];
  Napi::Value ccval = info[4];

  if (!this->drawTarget) {
    this->drawTarget = instantiateDrawTarget();
  }

  int x0 = round(xval.As<Napi::Number>().FloatValue());
  int y0 = round(yval.As<Napi::Number>().FloatValue());
  int x1 = round(x1val.As<Napi::Number>().FloatValue());
  int y1 = round(y1val.As<Napi::Number>().FloatValue());
  int connectCorners = ccval.As<Napi::Number>().Int32Value();

  uint32_t color = this->frontColor;

  PointList point_list;
  point_list.num = 2;
  point_list.xs = point_x;
  point_list.ys = point_y;
  point_list.xs[0] = x0;
  point_list.xs[1] = x1;
  point_list.ys[0] = y0;
  point_list.ys[1] = y1;

  drawLine(this->drawTarget, &point_list, color, connectCorners);

  Napi::Env env = info.Env();
  return Napi::Number::New(env, 0);
}

Napi::Value Plane::PutPolygon(const Napi::CallbackInfo& info) {
  if (info.Length() != 4) {
    printf("expected 4 arguments to this function\n");
    return info.Env().Null();
  }

  if (!this->drawTarget) {
    this->drawTarget = instantiateDrawTarget();
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
    point_list.num = num_points;
    point_list.xs = point_x;
    point_list.ys = point_y;

    for (int i = 0; i < num_points; i++) {
      Napi::Value elem = parameter_list[uint32_t(i)];
      // TODO: Validate this is an object
      Napi::Object pair = elem.ToObject();
      // TODO: validate length is 2
      // TODO: handle x,y object, instead of just array
      Napi::Value first = pair[uint32_t(0)];
      Napi::Value second = pair[uint32_t(1)];
      int first_num = round(first.As<Napi::Number>().FloatValue());
      int second_num = round(second.As<Napi::Number>().FloatValue());
      point_list.xs[i] = first_num + baseX;
      point_list.ys[i] = second_num + baseY;
    }

    bool fill = info[3].ToBoolean().Value();
    uint32_t color = this->frontColor;
    if (fill) {
      fillPolygon(this->drawTarget, &point_list, color);
    } else {
      drawPolygonOutline(this->drawTarget, &point_list, color);
    }
  }

  return info.Env().Null();
}

Napi::Value Plane::FillBackground(const Napi::CallbackInfo& info) {
  Napi::Value val = info[0];
  int color = round(val.As<Napi::Number>().FloatValue());

  uint32_t rgb = this->rgb_map[color % this->rgb_map_length];
  this->backColor = rgb;

  if (!this->drawTarget) {
    if (viewWidth && viewHeight) {
      this->drawTarget = instantiateDrawTarget();
    }
  }

  return info.Env().Null();
}

// TODO: Fix me
extern Image** g_img_list;
extern int num_img;

Napi::Value Plane::PutImage(const Napi::CallbackInfo& info) {
  if (!this->drawTarget) {
    this->drawTarget = instantiateDrawTarget();
  }
  GfxTarget* target = this->drawTarget;

  Napi::Object imgObj = info[0].ToObject();
  int baseX = info[1].ToNumber().Int32Value();
  int baseY = info[2].ToNumber().Int32Value();

  Napi::Value imgIdval = imgObj["id"];
  int imgId = imgIdval.ToNumber().Int32Value();

  if (imgId >= num_img) {
    printf("invalid image id: %d\n", imgId);
    return info.Env().Null();
  }
  Image* img_struct = g_img_list[imgId];

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
        if (pixelX >= 0 && pixelX < viewWidth &&
            pixelY >= 0 && pixelY < viewHeight) {
          target->buffer[pixelX + pixelY*target->pitch/4] = color;
        }
      }
    }
  }

  return info.Env().Null();
}

Napi::Value Plane::PutCircleFromArc(const Napi::CallbackInfo& info) {
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

  if (!this->drawTarget) {
    this->drawTarget = instantiateDrawTarget();
  }
  GfxTarget* target = this->drawTarget;
  uint32_t color = this->frontColor;

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
    putRange(target, baseX + a, baseY + b, baseX + L, baseY + b, color);
    putRange(target, baseX - a, baseY + b, baseX - L, baseY + b, color);
    putRange(target, baseX + a, baseY - b, baseX + L, baseY - b, color);
    putRange(target, baseX - a, baseY - b, baseX - L, baseY - b, color);
    putRange(target, baseX + b, baseY + a, baseX + b, baseY + L, color);
    putRange(target, baseX - b, baseY + a, baseX - b, baseY + L, color);
    putRange(target, baseX + b, baseY - a, baseX + b, baseY - L, color);
    putRange(target, baseX - b, baseY - a, baseX - b, baseY - L, color);
  }

  Napi::Env env = info.Env();
  return Napi::Number::New(env, 0);
}

Napi::Value Plane::PutFrameMemory(const Napi::CallbackInfo& info) {
  if (!this->drawTarget) {
    this->drawTarget = instantiateDrawTarget();
  }
  GfxTarget* target = this->drawTarget;

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

  for (int y = 0; y < target->y_size; y++) {
    for (int x = 0; x < target->x_size; x++) {
      unsigned char color = data[x + y*target->pitch/4];
      uint32_t rgb = this->rgb_map[color % this->rgb_map_length];
      target->buffer[x + y*target->pitch/4] = rgb;
    }
  }

  Napi::Env env = info.Env();
  return Napi::Number::New(env, 0);
}

Napi::Value Plane::SaveImage(const Napi::CallbackInfo& info) {
  if (!this->drawTarget) {
    this->drawTarget = instantiateDrawTarget();
  }
  GfxTarget* target = this->drawTarget;

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
  if (imgId >= num_img) {
    printf("invalid image id: %d\n", imgId);
    return info.Env().Null();
  }
  Image* img_struct = g_img_list[imgId];

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

void swap(int* a, int* b) {
  static int tmp;
  tmp = *a;
  *a = *b;
  *b = tmp;
}

void putRange(GfxTarget* target, int x0, int y0, int x1, int y1, uint32_t color) {
  if (x0 > x1) {
    swap(&x0, &x1);
  }
  if (y0 > y1) {
    swap(&y0, &y1);
  }
  if (x0 == x1) {
    if (x0 < 0 || x1 >= target->x_size) {
      return;
    }
    if (y0 < 0) {
      y0 = 0;
    }
    if (y1 >= target->y_size) {
      y1 = target->y_size - 1;
    }
    int x = x0;
    for (int y = y0; y <= y1; y++) {
      target->buffer[x + y*target->pitch/4] = color;
    }
  } else {
    if (y0 < 0 || y1 >= target->y_size) {
      return;
    }
    if (x0 < 0) {
      x0 = 0;
    }
    if (x1 >= target->x_size) {
      x1 = target->x_size - 1;
    }
    int y = y0;
    for (int x = x0; x <= x1; x++) {
      target->buffer[x + y*target->pitch/4] = color;
    }
  }
}
