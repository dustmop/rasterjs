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

Napi::Value RasterJS::CallTwo(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  printf("two\n");
  return Napi::Number::New(env, 0);
}

Napi::Value RasterJS::CallThree(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  printf("three\n");
  return Napi::Number::New(env, 0);
}
