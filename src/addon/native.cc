#include <napi.h>
#include "sdl_display.h"

Napi::Object CreateDisplay(const Napi::CallbackInfo& info) {
  return SDLDisplay::NewInstance(info.Env(), info[0]);
}

Napi::Object InitAll(Napi::Env env, Napi::Object exports) {
  exports.Set("display",
      Napi::Function::New(env, CreateDisplay, "CreateDisplay"));
  Napi::HandleScope scope(env);
  SDLDisplay::InitClass(env, exports);
  return exports;
}

NODE_API_MODULE(addon, InitAll)
