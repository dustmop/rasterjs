#include <napi.h>


#ifdef SDL_FOUND

  #include "sdl_display.h"

  // SDLDisplay compiled into this add-on if the library is found

  void initialize(Napi::Env env, Napi::Object exports) {
    SDLDisplay::InitClass(env, exports);
  }

  Napi::Object CreateDisplay(const Napi::CallbackInfo& info) {
    return SDLDisplay::NewInstance(info.Env(), info[0]);
  }

#else

  #include "fake_display.h"

  // FakeDisplay cannot actually display anything

  void initialize(Napi::Env env, Napi::Object exports) {
    FakeDisplay::InitClass(env, exports);
  }

  Napi::Object CreateDisplay(const Napi::CallbackInfo& info) {
    return FakeDisplay::NewInstance(info.Env(), info[0]);
  }

#endif


Napi::Object InitAll(Napi::Env env, Napi::Object exports) {
  exports.Set("display",
      Napi::Function::New(env, CreateDisplay, "CreateDisplay"));
  Napi::HandleScope scope(env);
  initialize(env, exports);
  return exports;
}


NODE_API_MODULE(addon, InitAll)
