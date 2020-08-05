#include "type.h"
#include "rasterjs.h"
#include "draw_polygon.h"
#include "time_keeper.h"
#include "load_image.h"

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
       InstanceMethod("createWindow", &RasterJS::CreateWindow),
       InstanceMethod("renderLoop", &RasterJS::RenderLoop),
       InstanceMethod("drawRect", &RasterJS::DrawRect),
       InstanceMethod("drawPoint", &RasterJS::DrawPoint),
       InstanceMethod("drawPolygon", &RasterJS::DrawPolygon),
       InstanceMethod("drawLine", &RasterJS::DrawLine),
       InstanceMethod("setColor", &RasterJS::SetColor),
       InstanceMethod("fillBackground", &RasterJS::FillBackground),
       InstanceMethod("loadImage", &RasterJS::LoadImage),
       InstanceMethod("assignRgbMapping", &RasterJS::AssignRgbMapping),
       InstanceMethod("drawImage", &RasterJS::DrawImage),
       InstanceMethod("drawCircleFromArc", &RasterJS::DrawCircleFromArc),
  });
  constructor = Napi::Persistent(func);
  constructor.SuppressDestruct();
  exports.Set("RasterJS", func);

  return exports;
}

class PrivateState {
 public:
  PrivateState();
  int r;
  int g;
  int b;
  int rgb_map_length;
  int rgb_map[256];
};

PrivateState::PrivateState() {
  this->r = 0;
  this->g = 0;
  this->b = 0;
  this->rgb_map_length = 0;
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

Napi::Value RasterJS::Initialize(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if( SDL_Init( SDL_INIT_VIDEO ) < 0 ) {
    printf("SDL could not initialize! SDL_Error: %s\n", SDL_GetError());
  } else {
    sdl_initialized = 1;
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

  viewWidth = info[0].As<Napi::Number>().Int32Value();
  viewHeight = info[1].As<Napi::Number>().Int32Value();

  // Create window
  window = SDL_CreateWindow( "SDL Tutorial", SDL_WINDOWPOS_UNDEFINED, SDL_WINDOWPOS_UNDEFINED, viewWidth, viewHeight, SDL_WINDOW_SHOWN | SDL_WINDOW_ALLOW_HIGHDPI );
  if (window == NULL) {
    printf("Window could not be created! SDL_Error: %s\n", SDL_GetError());
    exit(1);
  }
  return Napi::Number::New(env, 0);
}

void on_render(SDL_Window* window, SDL_Renderer* renderer);

Napi::Value RasterJS::RenderLoop(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (!sdl_initialized || !window) {
    return Napi::Number::New(env, -1);
  }

  if ((info.Length() < 1) || (!info[0].IsFunction())) {
    printf("RenderLoop requires an argument: function\n");
    exit(1);
  }

  Napi::Function renderFunc = info[0].As<Napi::Function>();

  // Get window renderer
  renderer = SDL_CreateRenderer(window, -1, SDL_RENDERER_ACCELERATED);
  if (!renderer) {
    printf("SDL_CreateRenderer() failed with \"%s.\"", SDL_GetError());
    return Napi::Number::New(env, -1);
  }

  texture = SDL_CreateTexture(renderer, SDL_PIXELFORMAT_RGBA8888,
      SDL_TEXTUREACCESS_TARGET, viewWidth, viewHeight);

  TimeKeeper keeper;
  keeper.Init();

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

    StartFrame();

    // If an error happened, break the loop
    renderFunc.Call(0, NULL);
    if (env.IsExceptionPending()) {
      break;
    }

    SDL_SetRenderTarget(renderer, NULL);
    SDL_RenderCopy(renderer, texture, NULL, NULL);
    // Swap buffers to display
    SDL_RenderPresent(renderer);

    keeper.WaitNextFrame();
  }

  return Napi::Number::New(env, 0);
}

#define TAU 6.283

#define OPAQUE 255

void RasterJS::StartFrame() {
  SDL_SetRenderTarget(renderer, texture);
  // Fill the surface white
  SDL_SetRenderDrawColor(renderer, 0xff, 0xff, 0xff, OPAQUE);
  SDL_RenderClear(renderer);
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
    int v = elem.As<Napi::Number>().Int32Value();
    priv->rgb_map[i] = v;
  }

  return info.Env().Null();
}

Napi::Value RasterJS::SetColor(const Napi::CallbackInfo& info) {
  PrivateState* priv = (PrivateState*)this->priv;

  Napi::Value val = info[0];
  int color = val.As<Napi::Number>().Int32Value();

  int rgb = priv->rgb_map[color % priv->rgb_map_length];
  priv->r = (rgb / 0x10000) % 0x100;
  priv->g = (rgb / 0x100) % 0x100;
  priv->b = (rgb / 0x1) % 0x100;

  SDL_SetRenderDrawColor(renderer, priv->r, priv->g, priv->b, OPAQUE);

  return info.Env().Null();
}

Napi::Value RasterJS::DrawRect(const Napi::CallbackInfo& info) {
  // TODO: Validate length of parameters, all should be numbers

  Napi::Value xval = info[0];
  Napi::Value yval = info[1];
  Napi::Value wval = info[2];
  Napi::Value hval = info[3];

  int x = round(xval.As<Napi::Number>().FloatValue());
  int y = round(yval.As<Napi::Number>().FloatValue());
  int w = round(wval.As<Napi::Number>().FloatValue());
  int h = round(hval.As<Napi::Number>().FloatValue());

  // Draw rectangle;
  SDL_Rect drawTarget;
  drawTarget.x = x;
  drawTarget.y = y;
  drawTarget.w = w;
  drawTarget.h = h;

  //PrivateState* priv = (PrivateState*)this->priv;
  //SDL_SetRenderDrawColor(renderer, priv->r, priv->g, priv->b, OPAQUE);

  SDL_RenderFillRect(renderer, &drawTarget);

  Napi::Env env = info.Env();
  return Napi::Number::New(env, 0);
}

Napi::Value RasterJS::DrawPoint(const Napi::CallbackInfo& info) {
  Napi::Value xval = info[0];
  Napi::Value yval = info[1];

  int x = round(xval.As<Napi::Number>().FloatValue());
  int y = round(yval.As<Napi::Number>().FloatValue());

  SDL_RenderDrawPoint(renderer, x, y);
  return info.Env().Null();
}

Napi::Value RasterJS::DrawLine(const Napi::CallbackInfo& info) {
  Napi::Value xval  = info[0];
  Napi::Value yval  = info[1];
  Napi::Value x1val = info[2];
  Napi::Value y1val = info[3];

  int x  = round(xval.As<Napi::Number>().FloatValue());
  int y  = round(yval.As<Napi::Number>().FloatValue());
  int x1 = round(x1val.As<Napi::Number>().FloatValue());
  int y1 = round(y1val.As<Napi::Number>().FloatValue());

  SDL_RenderDrawLine(renderer, x, y, x1, y1);

  Napi::Env env = info.Env();
  return Napi::Number::New(env, 0);
}

int point_x[16];
int point_y[16];

Napi::Value RasterJS::DrawPolygon(const Napi::CallbackInfo& info) {
  if (info.Length() != 3) {
    printf("expected 3 arguments to this function\n");
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
      point_x[i] = first_num + baseX;
      point_y[i] = second_num + baseY;
    }

    drawPolygon(renderer, point_x, point_y, num_points);
  }

  return info.Env().Null();
}

Napi::Value RasterJS::FillBackground(const Napi::CallbackInfo& info) {
  PrivateState* priv = (PrivateState*)this->priv;

  Napi::Value val = info[0];
  int color = round(val.As<Napi::Number>().FloatValue());

  int rgb = priv->rgb_map[color % priv->rgb_map_length];
  int r = (rgb / 0x10000) % 0x100;
  int g = (rgb / 0x100) % 0x100;
  int b = (rgb / 0x1) % 0x100;

  SDL_SetRenderDrawColor(renderer, r, g, b, OPAQUE);
  SDL_RenderClear(renderer);

  return info.Env().Null();
}

Image* g_img = NULL;

Napi::Value RasterJS::LoadImage(const Napi::CallbackInfo& info) {
  Napi::Value val = info[0];
  Napi::String str = val.ToString();
  std::string s = str.Utf8Value();
  // TODO: Other formats
  g_img = LoadPng(s.c_str());
  Napi::Env env = info.Env();
  return Napi::Number::New(env, 2);
}

Napi::Value RasterJS::DrawImage(const Napi::CallbackInfo& info) {
  int imgId = info[0].ToNumber().Int32Value();
  int baseX = info[1].ToNumber().Int32Value();
  int baseY = info[2].ToNumber().Int32Value();
  // TODO
  int width, height;
  uint8* data = NULL;
  GetPng(g_img, &width, &height, &data);
  for (int y = 0; y < height; y++) {
    for (int x = 0; x < width; x++) {
      uint8 r = data[(y*width+x)*4+0];
      uint8 g = data[(y*width+x)*4+1];
      uint8 b = data[(y*width+x)*4+2];
      uint8 a = data[(y*width+x)*4+3];
      if (a > 0x80) {
        SDL_SetRenderDrawColor(renderer, r, g, b, a);
        SDL_RenderDrawPoint(renderer, baseX + x, baseY + y);
      }
    }
  }

  return info.Env().Null();
}

Napi::Value RasterJS::DrawCircleFromArc(const Napi::CallbackInfo& info) {
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
      L = b - 1;
    }

    SDL_SetRenderDrawColor(renderer, 255, 0, 255, 255);
    if (L == -1) {
      // Draw circle's points.
      SDL_RenderDrawPoint(renderer, baseX + a, baseY + b);
      SDL_RenderDrawPoint(renderer, baseX - a, baseY + b);
      SDL_RenderDrawPoint(renderer, baseX + a, baseY - b);
      SDL_RenderDrawPoint(renderer, baseX - a, baseY - b);
      SDL_RenderDrawPoint(renderer, baseX + b, baseY + a);
      SDL_RenderDrawPoint(renderer, baseX - b, baseY + a);
      SDL_RenderDrawPoint(renderer, baseX + b, baseY - a);
      SDL_RenderDrawPoint(renderer, baseX - b, baseY - a);
    } else {
      // Fill circle by drawing lines.
      SDL_RenderDrawLine(renderer, baseX + a, baseY + b, baseX + L, baseY + b);
      SDL_RenderDrawLine(renderer, baseX - a, baseY + b, baseX - L, baseY + b);
      SDL_RenderDrawLine(renderer, baseX + a, baseY - b, baseX + L, baseY - b);
      SDL_RenderDrawLine(renderer, baseX - a, baseY - b, baseX - L, baseY - b);
      SDL_RenderDrawLine(renderer, baseX + b, baseY + a, baseX + b, baseY + L);
      SDL_RenderDrawLine(renderer, baseX + b, baseY - a, baseX + b, baseY - L);
      SDL_RenderDrawLine(renderer, baseX - b, baseY + a, baseX - b, baseY + L);
      SDL_RenderDrawLine(renderer, baseX - b, baseY - a, baseX - b, baseY - L);
    }
  }

  return info.Env().Null();
}
