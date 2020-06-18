#include "rasterjs.h"
#include "rgb_mapping.h"
#include "draw_polygon.h"
#include "time_keeper.h"

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
      {InstanceMethod("sdlInit", &RasterJS::SDLInit),
       InstanceMethod("createWindow", &RasterJS::CreateWindow),
       InstanceMethod("renderLoop", &RasterJS::RenderLoop),
       InstanceMethod("drawRect", &RasterJS::DrawRect),
       InstanceMethod("drawPolygon", &RasterJS::DrawPolygon),
       InstanceMethod("drawLine", &RasterJS::DrawLine),
       InstanceMethod("setColor", &RasterJS::SetColor),
       InstanceMethod("fillBackground", &RasterJS::FillBackground),
  });
  constructor = Napi::Persistent(func);
  constructor.SuppressDestruct();
  exports.Set("RasterJS", func);

  return exports;
}

RasterJS::RasterJS(const Napi::CallbackInfo& info)
    : Napi::ObjectWrap<RasterJS>(info) {
  Napi::Env env = info.Env();
  Napi::HandleScope scope(env);
};

Napi::Object RasterJS::NewInstance(Napi::Env env, Napi::Value arg) {
  Napi::EscapableHandleScope scope(env);
  Napi::Object obj = constructor.New({arg});
  return scope.Escape(napi_value(obj)).ToObject();
}

int sdl_initialized = 0;
SDL_Window* window = NULL;
SDL_Renderer* renderer = NULL;

Napi::Value RasterJS::SDLInit(const Napi::CallbackInfo& info) {
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

  int width = info[0].As<Napi::Number>().Int32Value();
  int height = info[1].As<Napi::Number>().Int32Value();

  // Create window
  window = SDL_CreateWindow( "SDL Tutorial", SDL_WINDOWPOS_UNDEFINED, SDL_WINDOWPOS_UNDEFINED, width, height, SDL_WINDOW_SHOWN );
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

    // Swap buffers to display
    SDL_RenderPresent(renderer);

    keeper.WaitNextFrame();
  }

  return Napi::Number::New(env, 0);
}

#define TAU 6.283

#define OPAQUE 255

void RasterJS::StartFrame() {
  // Fill the surface white
  SDL_SetRenderDrawColor(renderer, 0xff, 0xff, 0xff, OPAQUE);
  SDL_RenderClear(renderer);
}

Napi::Value RasterJS::SetColor(const Napi::CallbackInfo& info) {
  Napi::Value val = info[0];
  int color = val.As<Napi::Number>().Int32Value();
  this->drawColor = color;

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

  int rgb = rgb_mapping[this->drawColor & 0x3f];

  // Rectangle color is pink
  SDL_SetRenderDrawColor(renderer, rgb / 0x10000, (rgb / 0x100) % 0x100, rgb % 0x100, OPAQUE);
  SDL_RenderFillRect(renderer, &drawTarget);

  Napi::Env env = info.Env();
  return Napi::Number::New(env, 0);
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

  int rgb = rgb_mapping[this->drawColor & 0x3f];
  SDL_SetRenderDrawColor(renderer, rgb / 0x10000, (rgb / 0x100) % 0x100, rgb % 0x100, OPAQUE);

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

    int rgb = rgb_mapping[this->drawColor & 0x3f];
    SDL_SetRenderDrawColor(renderer, rgb / 0x10000, (rgb / 0x100) % 0x100, rgb % 0x100, OPAQUE);

    drawPolygon(renderer, point_x, point_y, num_points);
  }

  return info.Env().Null();
}

Napi::Value RasterJS::FillBackground(const Napi::CallbackInfo& info) {
  Napi::Value val = info[0];
  int color = round(val.As<Napi::Number>().FloatValue());

  int rgb = rgb_mapping[color & 0x3f];

  SDL_SetRenderDrawColor(renderer, rgb / 0x10000, (rgb / 0x100) % 0x100, rgb % 0x100, OPAQUE);
  SDL_RenderClear(renderer);

  return info.Env().Null();
}
