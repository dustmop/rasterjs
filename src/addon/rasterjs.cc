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
      env, "RasterJS", {InstanceMethod("callOne", &RasterJS::CallOne),
                             InstanceMethod("callTwo", &RasterJS::CallTwo),
                             InstanceMethod("callThree", &RasterJS::CallThree),
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

  this->counter_ = info[0].As<Napi::Number>().DoubleValue();
};

Napi::Object RasterJS::NewInstance(Napi::Env env, Napi::Value arg) {
  Napi::EscapableHandleScope scope(env);
  Napi::Object obj = constructor.New({arg});
  return scope.Escape(napi_value(obj)).ToObject();
}

int sdl_initialized = 0;
SDL_Window* window = NULL;
SDL_Renderer* renderer = NULL;

Napi::Value RasterJS::CallOne(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if( SDL_Init( SDL_INIT_VIDEO ) < 0 ) {
    printf("SDL could not initialize! SDL_Error: %s\n", SDL_GetError());
  } else {
    sdl_initialized = 1;
    printf("SDL_Init success\n");
  }
  return Napi::Number::New(env, 0);
}

const int SCREEN_WIDTH = 640;
const int SCREEN_HEIGHT = 480;

Napi::Value RasterJS::CallTwo(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (!sdl_initialized) {
    return Napi::Number::New(env, -1);
  }

  // Create window
  window = SDL_CreateWindow( "SDL Tutorial", SDL_WINDOWPOS_UNDEFINED, SDL_WINDOWPOS_UNDEFINED, SCREEN_WIDTH, SCREEN_HEIGHT, SDL_WINDOW_SHOWN );
  if (window == NULL) {
    printf("Window could not be created! SDL_Error: %s\n", SDL_GetError());
  }
  return Napi::Number::New(env, 0);
}

void on_render(SDL_Window* window, SDL_Renderer* renderer);

Napi::Value RasterJS::CallThree(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (!sdl_initialized || !window) {
    return Napi::Number::New(env, -1);
  }

  //Get window renderer
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

    on_render(window, renderer);

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

int timeClick = 0;

// returns a value between 0 and 1
float oscillate(int click, int period) {
  return (1.0 + sin(click * TAU / period)) / 2.0;
}

void on_render(SDL_Window* window, SDL_Renderer* renderer) {

  timeClick++;
  int size = 32 + 32 * oscillate(timeClick, 60);

  // Fill the surface white
  SDL_SetRenderDrawColor(renderer, 0xff, 0xff, 0xff, OPAQUE);
  SDL_RenderClear(renderer);

  // Draw rectangle;
  SDL_Rect drawTarget;
  drawTarget.x = 64;
  drawTarget.y = 64;
  drawTarget.w = size;
  drawTarget.h = size;

  // Rectangle color is pink
  SDL_SetRenderDrawColor(renderer, 0xff, 0, 0xff, OPAQUE);
  SDL_RenderFillRect(renderer, &drawTarget);
}
