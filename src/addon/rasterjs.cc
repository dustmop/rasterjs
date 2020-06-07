#include "rasterjs.h"
#include <napi.h>
#include <uv.h>
#include <cmath>
#include <chrono>

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
       InstanceMethod("drawSquare", &RasterJS::DrawSquare),
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

  // A basic main loop to handle events
  bool is_running = true;
  SDL_Event event;
  while (is_running) {

    auto start = std::chrono::high_resolution_clock::now();

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

    renderFunc.Call(0, NULL);

    // Swap buffers to display
    SDL_RenderPresent(renderer);

    // Sleep for the remainder of the frame
    auto elapsed = std::chrono::high_resolution_clock::now() - start;
    long long microseconds = std::chrono::duration_cast<std::chrono::microseconds>(elapsed).count();
    long milliseconds = microseconds / 1000;
    if (milliseconds < 16) {
      SDL_Delay(16 - milliseconds);
    }

  }

  return Napi::Number::New(env, 0);
}

#define TAU 6.283

#define OPAQUE 255

Napi::Value RasterJS::DrawRect(const Napi::CallbackInfo& info) {
  // TODO: Validate length of parameters, all should be numbers

  Napi::Value xval = info[0];
  Napi::Value yval = info[1];
  Napi::Value wval = info[2];
  Napi::Value hval = info[3];

  int x = xval.As<Napi::Number>().Int32Value();
  int y = yval.As<Napi::Number>().Int32Value();
  int w = wval.As<Napi::Number>().Int32Value();
  int h = hval.As<Napi::Number>().Int32Value();

  // Fill the surface white
  SDL_SetRenderDrawColor(renderer, 0xff, 0xff, 0xff, OPAQUE);
  SDL_RenderClear(renderer);

  // Draw rectangle;
  SDL_Rect drawTarget;
  drawTarget.x = x;
  drawTarget.y = y;
  drawTarget.w = w;
  drawTarget.h = h;

  // Rectangle color is pink
  SDL_SetRenderDrawColor(renderer, 0xff, 0, 0xff, OPAQUE);
  SDL_RenderFillRect(renderer, &drawTarget);

  Napi::Env env = info.Env();
  return Napi::Number::New(env, 0);
}

Napi::Value RasterJS::DrawSquare(const Napi::CallbackInfo& info) {
  // TODO: Validate the parameters.
  Napi::Object arg = info[0].As<Napi::Object>();
  Napi::Value xval = arg.Get("x");
  Napi::Value yval = arg.Get("y");
  Napi::Value sizeval = arg.Get("size");

  int x = xval.As<Napi::Number>().Int32Value();
  int y = yval.As<Napi::Number>().Int32Value();
  float size = sizeval.As<Napi::Number>().FloatValue();

  // Fill the surface white
  SDL_SetRenderDrawColor(renderer, 0xff, 0xff, 0xff, OPAQUE);
  SDL_RenderClear(renderer);

  // Draw rectangle;
  SDL_Rect drawTarget;
  drawTarget.x = x;
  drawTarget.y = y;
  drawTarget.w = size;
  drawTarget.h = size;

  // Rectangle color is pink
  SDL_SetRenderDrawColor(renderer, 0xff, 0, 0xff, OPAQUE);
  SDL_RenderFillRect(renderer, &drawTarget);

  Napi::Env env = info.Env();
  return Napi::Number::New(env, 0);
}
