#include <napi.h>

#ifdef SDL_ENABLED
#include "sdl_backend.h"
#endif

#ifdef RASPBERRYPI
#include "rpi_backend.h"
#endif

void initialize(Napi::Env env, Napi::Object exports) {

  #ifdef SDL_ENABLED
  SDLBackend::InitClass(env, exports);
  #endif

  #ifdef RASPBERRYPI
  RPIBackend::InitClass(env, exports);
  #endif
}

Napi::Object MakeBackend(const Napi::CallbackInfo& info) {
  Napi::String name = info[0].ToString();

  #ifdef SDL_ENABLED
  if (name.Utf8Value() == std::string("sdl")) {
    return SDLBackend::NewInstance(info.Env(), info[0]);
  }
  #endif

  #ifdef RASPBERRYPI
  if (name.Utf8Value() == std::string("rpi")) {
    return RPIBackend::NewInstance(info.Env(), info[0]);
  }
  #endif

  return info.Env().Null().ToObject();
}

Napi::Object Supports(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  Napi::Array list = Napi::Array::New(env);
  int i = 0;

  #ifdef SDL_ENABLED
  list[i] = "sdl";
  i++;
  #endif

  #ifdef RASPBERRYPI
  list[i] = "rpi";
  i++;
  #endif

  return list;
}

Napi::Object InitAll(Napi::Env env, Napi::Object exports) {
  exports.Set("make",
      Napi::Function::New(env, MakeBackend, "MakeBackend"));
  exports.Set("supports",
      Napi::Function::New(env, Supports, "Supports"));
  Napi::HandleScope scope(env);
  initialize(env, exports);
  return exports;
}

NODE_API_MODULE(addon, InitAll)
