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

bool isInt(float f);

#define WHITE_32BIT 0xffffffff
#define BLACK_32BIT 0x000000ff

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
       InstanceMethod("putSequence", &Plane::PutSequence),
       InstanceMethod("putImage", &Plane::PutImage),
       InstanceMethod("putCircleFromArc", &Plane::PutCircleFromArc),
       InstanceMethod("putFrameMemory", &Plane::PutFrameMemory),
       InstanceMethod("putColorChange", &Plane::PutColorChange),
       InstanceAccessor<&Plane::GetWidth>("width"),
       InstanceAccessor<&Plane::GetHeight>("height"),
       InstanceMethod("toRawBuffer", &Plane::ToRawBuffer),
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
  this->frontColor = WHITE_32BIT;
  this->backColor = BLACK_32BIT;
  this->rowSize = 0;
  this->numElems = 0;
  this->buffer = NULL;
  this->longLivedBuffer = NULL;
  this->width = 0;
  this->height = 0;
  this->needErase = true;
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

Napi::Value Plane::GetWidth(const Napi::CallbackInfo &info) {
  Napi::Env env = info.Env();
  return Napi::Number::New(env, this->width);
}

Napi::Value Plane::GetHeight(const Napi::CallbackInfo &info) {
  Napi::Env env = info.Env();
  return Napi::Number::New(env, this->height);
}

Napi::Value Plane::ToRawBuffer(const Napi::CallbackInfo &info) {
  Napi::Env env = info.Env();

  //
  int numElems = this->height * this->rowSize;
  if (this->longLivedBuffer == NULL) {
    uint32_t* buffer = new uint32_t[numElems];
    this->longLivedBuffer = buffer;
  }

  //
  for (int k = 0; k < numElems; k++) {
    this->longLivedBuffer[k] = this->buffer[k];
  }

  //
  int numBytes = numElems * 4;
  Napi::ArrayBuffer buff;
  buff = Napi::ArrayBuffer::New(env, this->longLivedBuffer, numBytes);

  return buff;
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
  this->frontColor = WHITE_32BIT;
  this->backColor = BLACK_32BIT;
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
  int rgb = num * 0x100 + 0xff;
  for (int i = 0; i < size; i++) {
    if (this->rgbMap[i] == rgb) {
      return Napi::Number::New(env, i);
    }
  }
  // Add it to the map
  int index = this->rgbMapIndex;
  this->rgbMap[index] = rgb;
  if (size < 0x100) {
    this->rgbMapSize++;
  }
  this->rgbMapIndex = (this->rgbMapIndex + 1) % 0x100;
  return Napi::Number::New(env, index);
}

Napi::Value Plane::RetrieveTrueContent(const Napi::CallbackInfo& info) {
  this->prepare();

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

  // Read the already existing color set.
  for (int i = 0; i < this->rgbMapSize; i++) {
    rgb_val = this->rgbMap[i];
    color_use_lookup[rgb_val] = i;
    num_colors++;
  }

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

Napi::Value Plane::PutSequence(const Napi::CallbackInfo& info) {
  this->prepare();

  uint32_t color = this->frontColor;

  Napi::Value elem = info[0];
  Napi::Object list = elem.ToObject();
  Napi::Value list_length = list.Get("length");
  int num = list_length.As<Napi::Number>().Int32Value();

  GfxTarget target;
  this->fillTarget(&target);

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
            this->buffer[x + y*this->rowSize] = color;
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
          putRange(&target, x0, y0, x1, y1, color);
      }
  }

  Napi::Env env = info.Env();
  return Napi::Number::New(env, 0);
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

  int x = info[0].ToNumber().Int32Value();
  int y = info[1].ToNumber().Int32Value();

  // Num points will always be assigned, but num inner is optional.
  int numPoints = -1;
  int numInner = -1;

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
  Napi::Object parameterList = val.ToObject();
  Napi::Value parameterLength = parameterList.Get("length");
  numPoints = parameterLength.As<Napi::Number>().Int32Value();

  // Optionally get the second list of pairs, and if so, assign num inner.
  Napi::Value inner = info[3];
  Napi::Object innerList;
  if (inner.IsObject()) {
    if (inner.IsArray()) {
      innerList = inner.ToObject();
      Napi::Value innerLength = innerList.Get("length");
      numInner = innerLength.As<Napi::Number>().Int32Value();
    }
  }

  bool fill = info[4].ToBoolean().Value();
  uint32_t color = this->frontColor;
  GfxTarget target;
  this->fillTarget(&target);

  bool half = info[5].ToBoolean().Value();

  for (int i = 0; i < numPoints; i++) {
    Napi::Value elem = parameterList[uint32_t(i)];
    // TODO: Validate this is an object
    Napi::Object pair = elem.ToObject();
    // TODO: validate length is 2
    Napi::Value first = pair[uint32_t(0)];
    Napi::Value second = pair[uint32_t(1)];

    // The circle is defined by an arc that represents one octant of the
    // full circle. This arc is a list of int pairs. One is called the stretch
    // and begins equal to the radius, then moves occassional back towards
    // the origin as it moves around the circumfrence. The other is called
    // the cross, and moves laterally away from the origin, monotonically at
    // end step.
    //
    // For example:
    //
    //           arc
    //            |
    //            v
    //           \    ^
    //            |   |
    //             \  | <- cross
    //              | |
    //              | |
    // ------------->
    //        ^
    //        |
    //     stretch
    //
    // In this case, the total stretch = 13, and the total cross = 5.
    // The arc is this list of ints: [[13,0],[13,1],[12,2],[12,3],[11,4]]

    int stretch = first.As<Napi::Number>().Int32Value();
    int cross = second.As<Napi::Number>().Int32Value();

    int limit = -1;
    if (i < numInner) {
      // If inner list exists, and we're inside it, get the Left value.
      Napi::Value elem = innerList[uint32_t(i)];
      Napi::Object pair = elem.ToObject();
      Napi::Value left = pair[uint32_t(0)];
      limit = left.As<Napi::Number>().Int32Value();
    } else if (numInner != -1) {
      // If inner list exists, and we're past it, Left is the diagonal border.
      limit = cross - 2;
    }

    // Handle the difference between far values (those going in a positive
    // direction), and near values (those going in a negative direction),
    // when the circle radius is at a halfway value. This is needed in order
    // to give the circle the proper width.
    int adjustFar = 0;
    if (!half) {
      adjustFar = 1;
    }
    // Far stretch, near stretch, far cross, and near cross.
    int fars = stretch - adjustFar;
    int nears = -stretch;
    int farc = cross - adjustFar;
    int nearc = -cross;

    // Far limit, and near limit.
    int farl = 0;
    int nearl = 0;
    if (fill) {
      // When filling the circle, put the range completely to the origin.
      farl = 0;
      nearl = 0;
    } else if (limit == -1) {
      // If no width given, set a width of 1
      farl = stretch - adjustFar;
      nearl = -stretch;
    } else {
      // If a width was given, use a range limit.
      farl = limit - adjustFar;
      nearl = -limit;
    }

    // Call putRange, and draw the appropriate mirrored octant of the arc
    // in order to draw the complete the circle. Numbered as follows:
    //
    //            2    |    1
    //             \   |   /
    //              |  |  |
    //               \ | /
    //   3 ____      | | |      ____ 0
    //         \----  \|/  ----/
    //              \--|--/
    // -----------------------------------
    //               --|--
    //          ----/ /|\ \----
    //     ____/      |||      \____ 7
    //   4           / | \
    //              |  |  |
    //             /   |   \
    //            5    |    6

    // The octants with x-scretchs and y-crosses
    putRange(&target, x + fars,  y + nearc, x + farl,  y + nearc, color); // 0
    putRange(&target, x + fars,  y + farc,  x + farl,  y + farc,  color); // 7
    putRange(&target, x + nears, y + nearc, x + nearl, y + nearc, color); // 3
    putRange(&target, x + nears, y + farc,  x + nearl, y + farc,  color); // 4

    // The octants with x-crosses and y-stretchs
    putRange(&target, x + farc,  y + nears, x + farc,  y + nearl, color); // 1
    putRange(&target, x + nearc, y + nears, x + nearc, y + nearl, color); // 2
    putRange(&target, x + farc,  y + fars,  x + farc,  y + farl,  color); // 6
    putRange(&target, x + nearc, y + fars,  x + nearc, y + farl,  color); // 5
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

Napi::Value retError(const Napi::CallbackInfo& info, const char* msg) {
  printf("%s\n", msg);
  return info.Env().Null();
}

Napi::Value Plane::PutColorChange(const Napi::CallbackInfo& info) {
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
    this->buffer[imageIndex] = nextRgb;
  }
  return info.Env().Null();
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

bool isInt(float f) {
  double whole;
  double fract = modf(double(f), &whole);
  return fract == 0.0;
}
