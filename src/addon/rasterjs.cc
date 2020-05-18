#include "rasterjs.h"
#include <napi.h>
#include <uv.h>

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
SDL_Surface* screenSurface = NULL;

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
  if(window == NULL) {
    printf("Window could not be created! SDL_Error: %s\n", SDL_GetError());
  }
  return Napi::Number::New(env, 0);
}

Napi::Value RasterJS::CallThree(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (!sdl_initialized || !window) {
    return Napi::Number::New(env, -1);
  }

  //Get window surface
  screenSurface = SDL_GetWindowSurface( window );

  //Fill the surface white
  SDL_FillRect( screenSurface, NULL, SDL_MapRGB( screenSurface->format, 0xFF, 0xFF, 0xFF ) );

  //Update the surface
  SDL_UpdateWindowSurface( window );

  // A basic main loop to handle events
  bool is_running = true;
  SDL_Event event;
  while (is_running) {
    while (SDL_PollEvent(&event)) {
      if (event.type == SDL_QUIT) {
        is_running = false;
      }
    }
    SDL_Delay(16);
  }

  return Napi::Number::New(env, 0);
}
