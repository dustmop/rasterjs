#include <napi.h>


#ifdef SDL_FOUND

  #include "sdl_backend.h"

  // SDLBackend compiled into this add-on if the library is found

  void initialize(Napi::Env env, Napi::Object exports) {
    SDLBackend::InitClass(env, exports);
  }

  Napi::Object CreateBackend(const Napi::CallbackInfo& info) {
    return SDLBackend::NewInstance(info.Env(), info[0]);
  }

#else

  #include "fake_backend.h"

  // FakeBackend cannot actually display anything

  void initialize(Napi::Env env, Napi::Object exports) {
    FakeBackend::InitClass(env, exports);
  }

  Napi::Object CreateBackend(const Napi::CallbackInfo& info) {
    return FakeBackend::NewInstance(info.Env(), info[0]);
  }

#endif


Napi::Object InitAll(Napi::Env env, Napi::Object exports) {
  exports.Set("backend",
      Napi::Function::New(env, CreateBackend, "CreateBackend"));
  Napi::HandleScope scope(env);
  initialize(env, exports);
  return exports;
}


NODE_API_MODULE(addon, InitAll)
