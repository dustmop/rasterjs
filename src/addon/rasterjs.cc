#include "type.h"
#include "rasterjs.h"
#include "draw_polygon.h"
#include "line.h"
#include "time_keeper.h"
#include "load_image.h"
#include "rect.h"
#include "png_read_write.h"

#include <napi.h>
#include <uv.h>
#include <cmath>
#include <chrono>
#include <cmath>

#include <SDL.h>

using namespace Napi;

Napi::FunctionReference RasterJS::constructor;

Napi::Object RasterJS::Init(Napi::Env env, Napi::Object exports) {
  Napi::HandleScope scope(env);

  Napi::Function func = DefineClass(
      env,
      "RasterJS",
      {InstanceMethod("initialize", &RasterJS::Initialize),
       InstanceMethod("resetState", &RasterJS::ResetState),
       InstanceMethod("createWindow", &RasterJS::CreateWindow),
       InstanceMethod("createDisplay", &RasterJS::CreateDisplay),
       InstanceMethod("appRenderAndLoop", &RasterJS::AppRenderAndLoop),
       InstanceMethod("setSize", &RasterJS::SetSize),
       InstanceMethod("setColor", &RasterJS::SetColor),
       InstanceMethod("fillBackground", &RasterJS::FillBackground),
       InstanceMethod("saveTo", &RasterJS::SaveTo),
       InstanceMethod("loadImage", &RasterJS::LoadImage),
       InstanceMethod("assignRgbMapping", &RasterJS::AssignRgbMapping),
       InstanceMethod("putRect", &RasterJS::PutRect),
       InstanceMethod("putPoint", &RasterJS::PutPoint),
       InstanceMethod("putPolygon", &RasterJS::PutPolygon),
       InstanceMethod("putLine", &RasterJS::PutLine),
       InstanceMethod("putImage", &RasterJS::PutImage),
       InstanceMethod("putCircleFromArc", &RasterJS::PutCircleFromArc),
       InstanceMethod("putDirect", &RasterJS::PutDirect),
       InstanceMethod("saveImage", &RasterJS::SaveImage),
  });
  constructor = Napi::Persistent(func);
  constructor.SuppressDestruct();
  exports.Set("RasterJS", func);

  return exports;
}

class PrivateState {
 public:
  PrivateState();
  int rgb_map_length;
  int rgb_map[256];
  GfxTarget* allocTarget;
  GfxTarget* drawTarget;
  uint32_t frontColor;
  uint32_t backColor;
};

PrivateState::PrivateState() {
  this->rgb_map_length = 0;
  this->frontColor = 0xffffffff;
  this->backColor = 0;
  this->drawTarget = NULL;
  this->allocTarget = NULL;
}

RasterJS::RasterJS(const Napi::CallbackInfo& info)
    : Napi::ObjectWrap<RasterJS>(info) {
  Napi::Env env = info.Env();
  Napi::HandleScope scope(env);
  this->priv = new PrivateState();
};

Napi::Object RasterJS::NewInstance(Napi::Env env, Napi::Value arg) {
  Napi::EscapableHandleScope scope(env);
  Napi::Object obj = constructor.New({arg});
  return scope.Escape(napi_value(obj)).ToObject();
}

int sdl_initialized = 0;
SDL_Window* window = NULL;
SDL_Renderer* renderer = NULL;
SDL_Texture* texture = NULL;
int viewWidth = 0;
int viewHeight = 0;
int windowWidth = 0;
int windowHeight = 0;

int point_x[16];
int point_y[16];

Napi::Value RasterJS::SetSize(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  viewWidth = info[0].As<Napi::Number>().Int32Value();
  viewHeight = info[1].As<Napi::Number>().Int32Value();
  return Napi::Number::New(env, 0);
}

GfxTarget* instantiateDrawTarget(PrivateState* priv) {
  if (!priv->allocTarget) {
    priv->allocTarget = (GfxTarget*)malloc(sizeof(GfxTarget));
    if (priv->allocTarget == NULL) {
      printf("allocTarget failed to malloc\n");
      exit(1);
    }
    if (!viewWidth || !viewHeight) {
      printf("cannot allocate a target with zero size\n");
      exit(1);
    }
    priv->allocTarget->x_size = viewWidth;
    priv->allocTarget->y_size = viewHeight;
    priv->allocTarget->pitch = viewWidth * 4;
    priv->allocTarget->capacity = priv->allocTarget->pitch * viewHeight;
    priv->allocTarget->buffer = (uint32_t*)malloc(priv->allocTarget->capacity);
    if (priv->allocTarget->buffer == NULL) {
      printf("allocTarget.buffer failed to malloc\n");
      exit(1);
    }
  }
  uint32_t* colors = (uint32_t*)priv->allocTarget->buffer;
  for (int n = 0; n < priv->allocTarget->capacity / 4; n++) {
    colors[n] = priv->backColor;
  }
  return priv->allocTarget;
}

uint32_t makeColor(PrivateState* priv) {
  return priv->frontColor;
}

void putRange(GfxTarget* target, int x0, int y0, int x1, int y1, uint32_t color);

Napi::Value RasterJS::Initialize(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if( SDL_Init( SDL_INIT_VIDEO ) < 0 ) {
    printf("SDL could not initialize! SDL_Error: %s\n", SDL_GetError());
  } else {
    sdl_initialized = 1;
  }
  return Napi::Number::New(env, 0);
}

Napi::Value RasterJS::ResetState(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  viewWidth = 0;
  viewHeight = 0;
  PrivateState* priv = (PrivateState*)this->priv;
  if (priv->allocTarget) {
    free(priv->allocTarget);
    priv->allocTarget = NULL;
    priv->drawTarget = NULL;
  }
  return Napi::Number::New(env, 0);
}

Napi::Value RasterJS::CreateWindow(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (!sdl_initialized) {
    return Napi::Number::New(env, -1);
  }

  if (info.Length() < 2) {
    printf("CreateWindow needs two parameters\n");
    exit(1);
  }

  int zoomLevel = info[2].As<Napi::Number>().Int32Value();
  // TODO: Remove global variables.
  windowWidth = viewWidth * zoomLevel;
  windowHeight = viewHeight * zoomLevel;

  // Create window
  window = SDL_CreateWindow(
      "RasterJS",
      SDL_WINDOWPOS_UNDEFINED,
      SDL_WINDOWPOS_UNDEFINED,
      windowWidth, windowHeight,
      SDL_WINDOW_SHOWN | SDL_WINDOW_ALLOW_HIGHDPI);
  if (window == NULL) {
    printf("Window could not be created! SDL_Error: %s\n", SDL_GetError());
    exit(1);
  }
  return Napi::Number::New(env, 0);
}

Napi::Value RasterJS::CreateDisplay(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  viewWidth = info[0].As<Napi::Number>().Int32Value();
  viewHeight = info[1].As<Napi::Number>().Int32Value();
  return Napi::Number::New(env, 0);
}

Napi::Value RasterJS::SaveTo(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!viewWidth || !viewHeight) {
    printf("cannot save file with zero size\n");
    exit(1);
  }

  PrivateState* priv = (PrivateState*)this->priv;
  Napi::String savepath = info[0].ToString();
  write_png(savepath.Utf8Value().c_str(),
            (unsigned char*)priv->drawTarget->buffer,
            viewWidth,
            viewHeight,
            priv->drawTarget->pitch);
  return Napi::Number::New(env, 0);
}

void on_render(SDL_Window* window, SDL_Renderer* renderer);

Napi::Value RasterJS::AppRenderAndLoop(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (!sdl_initialized || !window) {
    return Napi::Number::New(env, -1);
  }

  if ((info.Length() < 2) || (!info[0].IsFunction()) || (!info[1].IsNumber())) {
    printf("AppRenderAndLoop arguments: function, bool\n");
    exit(1);
  }

  Napi::Function renderFunc = info[0].As<Napi::Function>();
  int num_render = info[1].ToNumber().Int32Value();

  // Get window renderer
  renderer = SDL_CreateRenderer(window, -1, SDL_RENDERER_ACCELERATED);
  if (!renderer) {
    printf("SDL_CreateRenderer() failed with \"%s.\"", SDL_GetError());
    return Napi::Number::New(env, -1);
  }

  texture = SDL_CreateTexture(renderer, SDL_PIXELFORMAT_RGBA8888,
                              SDL_TEXTUREACCESS_STREAMING,
                              viewWidth, viewHeight);

  TimeKeeper keeper;
  keeper.Init();

  PrivateState* priv = (PrivateState*)this->priv;

  // A basic main loop to handle events
  bool is_running = true;
  SDL_Event event;
  while (is_running) {
    if (SDL_PollEvent(&event)) {
      switch (event.type) {
      case SDL_QUIT:
        is_running = false;
        break;
      case SDL_KEYDOWN:
        if (event.key.keysym.sym == SDLK_ESCAPE) {
          is_running = false;
        }
        break;
      case SDL_WINDOWEVENT_CLOSE:
        is_running = false;
        break;
      default:
        break;
      }
    }

    if (num_render == 0) {
      SDL_Delay(16);
      continue;
    }

    StartFrame();

    // If an error happened, break the loop
    renderFunc.Call(0, NULL);
    if (env.IsExceptionPending()) {
      break;
    }

    if (priv->drawTarget) {
      SDL_UpdateTexture(texture, NULL, priv->drawTarget->buffer,
                        priv->drawTarget->pitch);
    }

    SDL_RenderCopy(renderer, texture, NULL, NULL);
    // Swap buffers to display
    SDL_RenderPresent(renderer);

    keeper.WaitNextFrame();

    if (num_render > 0) {
      num_render--;
    }

    EndFrame();
  }

  return Napi::Number::New(env, 0);
}

#define TAU 6.283

#define OPAQUE 255

void RasterJS::StartFrame() {
  SDL_RenderClear(renderer);
}

void RasterJS::EndFrame() {
  PrivateState* priv = (PrivateState*)this->priv;
  priv->drawTarget = NULL;
}

Napi::Value RasterJS::AssignRgbMapping(const Napi::CallbackInfo& info) {
  PrivateState* priv = (PrivateState*)this->priv;

  Napi::Value elem = info[0];
  Napi::Object list = elem.ToObject();
  Napi::Value list_length = list.Get("length");

  int num = list_length.As<Napi::Number>().Int32Value();
  priv->rgb_map_length = num;

  for (int i = 0; i < num; i++) {
    elem = list[uint32_t(i)];
    int val = elem.As<Napi::Number>().Int32Value();
    // Store values as little-endian RGBA.
    priv->rgb_map[i] = val * 0x100 + 0xff;
  }

  return info.Env().Null();
}

Napi::Value RasterJS::SetColor(const Napi::CallbackInfo& info) {
  PrivateState* priv = (PrivateState*)this->priv;

  Napi::Value val = info[0];
  int color = val.As<Napi::Number>().Int32Value();

  uint32_t rgb = priv->rgb_map[color % priv->rgb_map_length];
  priv->frontColor = rgb;

  return info.Env().Null();
}

Napi::Value RasterJS::PutRect(const Napi::CallbackInfo& info) {
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

  PrivateState* priv = (PrivateState*)this->priv;
  if (!priv->drawTarget) {
    priv->drawTarget = instantiateDrawTarget(priv);
  }

  uint32_t color = makeColor(priv);
  drawRect(priv->drawTarget, x, y, x+w, y+h, fill, color);

  Napi::Env env = info.Env();
  return Napi::Number::New(env, 0);
}

Napi::Value RasterJS::PutPoint(const Napi::CallbackInfo& info) {
  Napi::Value xval = info[0];
  Napi::Value yval = info[1];

  int x = round(xval.As<Napi::Number>().FloatValue());
  int y = round(yval.As<Napi::Number>().FloatValue());

  PrivateState* priv = (PrivateState*)this->priv;
  uint32_t color = makeColor(priv);
  if (!priv->drawTarget) {
    priv->drawTarget = instantiateDrawTarget(priv);
  }
  priv->drawTarget->buffer[x + y*priv->drawTarget->pitch/4] = color;

  return info.Env().Null();
}

Napi::Value RasterJS::PutLine(const Napi::CallbackInfo& info) {
  Napi::Value xval  = info[0];
  Napi::Value yval  = info[1];
  Napi::Value x1val = info[2];
  Napi::Value y1val = info[3];

  PrivateState* priv = (PrivateState*)this->priv;
  if (!priv->drawTarget) {
    priv->drawTarget = instantiateDrawTarget(priv);
  }

  int x0 = round(xval.As<Napi::Number>().FloatValue());
  int y0 = round(yval.As<Napi::Number>().FloatValue());
  int x1 = round(x1val.As<Napi::Number>().FloatValue());
  int y1 = round(y1val.As<Napi::Number>().FloatValue());

  uint32_t color = makeColor(priv);

  PointList point_list;
  point_list.num = 2;
  point_list.xs = point_x;
  point_list.ys = point_y;
  point_list.xs[0] = x0;
  point_list.xs[1] = x1;
  point_list.ys[0] = y0;
  point_list.ys[1] = y1;

  drawLine(priv->drawTarget, &point_list, color);

  Napi::Env env = info.Env();
  return Napi::Number::New(env, 0);
}

Napi::Value RasterJS::PutPolygon(const Napi::CallbackInfo& info) {
  if (info.Length() != 4) {
    printf("expected 4 arguments to this function\n");
    return info.Env().Null();
  }

  PrivateState* priv = (PrivateState*)this->priv;
  if (!priv->drawTarget) {
    priv->drawTarget = instantiateDrawTarget(priv);
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
      int first_num = first.As<Napi::Number>().Int32Value();
      int second_num = second.As<Napi::Number>().Int32Value();
      point_list.xs[i] = first_num + baseX;
      point_list.ys[i] = second_num + baseY;
    }

    bool fill = info[3].ToBoolean().Value();
    uint32_t color = makeColor(priv);
    if (fill) {
      drawPolygon(priv->drawTarget, &point_list, color);
    } else {
      drawPolygonOutline(priv->drawTarget, &point_list, color);
    }
  }

  return info.Env().Null();
}

Napi::Value RasterJS::FillBackground(const Napi::CallbackInfo& info) {
  PrivateState* priv = (PrivateState*)this->priv;

  Napi::Value val = info[0];
  int color = round(val.As<Napi::Number>().FloatValue());

  uint32_t rgb = priv->rgb_map[color % priv->rgb_map_length];
  priv->backColor = rgb;

  if (!priv->drawTarget) {
    if (viewWidth && viewHeight) {
      priv->drawTarget = instantiateDrawTarget(priv);
    }
  }

  return info.Env().Null();
}

Image** g_img_list = NULL;
int num_img = 0;

Napi::Value RasterJS::LoadImage(const Napi::CallbackInfo& info) {
  Napi::Value val = info[0];
  Napi::String str = val.ToString();
  std::string s = str.Utf8Value();
  // TODO: Other formats
  Image* img = LoadPng(s.c_str());
  if (g_img_list == NULL) {
    int capacity = sizeof(Image*) * 100;
    g_img_list = (Image**)malloc(capacity);
    memset(g_img_list, 0, capacity);
  }
  int id = num_img;
  g_img_list[num_img] = img;
  num_img++;

  Napi::Env env = info.Env();
  return Napi::Number::New(env, id);
}

Napi::Value RasterJS::PutImage(const Napi::CallbackInfo& info) {
  PrivateState* priv = (PrivateState*)this->priv;
  if (!priv->drawTarget) {
    priv->drawTarget = instantiateDrawTarget(priv);
  }
  GfxTarget* target = priv->drawTarget;

  int imgId = info[0].ToNumber().Int32Value();
  int baseX = info[1].ToNumber().Int32Value();
  int baseY = info[2].ToNumber().Int32Value();

  if (imgId >= num_img) {
    printf("invalid image id: %d\n", imgId);
    return info.Env().Null();
  }
  Image* img_struct = g_img_list[imgId];

  int width, height;
  uint8* data = NULL;
  GetPng(img_struct, &width, &height, &data);

  for (int y = 0; y < height; y++) {
    for (int x = 0; x < width; x++) {
      uint8 r = data[(y*width+x)*4+0];
      uint8 g = data[(y*width+x)*4+1];
      uint8 b = data[(y*width+x)*4+2];
      uint8 a = data[(y*width+x)*4+3];
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

Napi::Value RasterJS::PutCircleFromArc(const Napi::CallbackInfo& info) {
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

  PrivateState* priv = (PrivateState*)this->priv;
  if (!priv->drawTarget) {
    priv->drawTarget = instantiateDrawTarget(priv);
  }
  GfxTarget* target = priv->drawTarget;
  uint32_t color = makeColor(priv);

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

Napi::Value RasterJS::PutDirect(const Napi::CallbackInfo& info) {
  PrivateState* priv = (PrivateState*)this->priv;
  if (!priv->drawTarget) {
    priv->drawTarget = instantiateDrawTarget(priv);
  }
  GfxTarget* target = priv->drawTarget;

  if (info.Length() < 1) {
    printf("PutDirect needs 1 param");
    exit(1);
  }
  if (!info[0].IsTypedArray()) {
    printf("PutDirect needs TypedArray");
    exit(1);
  }

  Napi::ArrayBuffer buffer = info[0].As<Napi::TypedArray>().ArrayBuffer();
  unsigned char* data = (unsigned char*)buffer.Data();

  for (int y = 0; y < target->y_size; y++) {
    for (int x = 0; x < target->x_size; x++) {
      unsigned char color = data[x + y*target->pitch/4];
      uint32_t rgb = priv->rgb_map[color % priv->rgb_map_length];
      target->buffer[x + y*target->pitch/4] = rgb;
    }
  }

  Napi::Env env = info.Env();
  return Napi::Number::New(env, 0);
}

Napi::Value RasterJS::SaveImage(const Napi::CallbackInfo& info) {
  PrivateState* priv = (PrivateState*)this->priv;
  if (!priv->drawTarget) {
    priv->drawTarget = instantiateDrawTarget(priv);
  }
  GfxTarget* target = priv->drawTarget;

  if (info.Length() < 2) {
    printf("PutDirect needs 2 params");
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
