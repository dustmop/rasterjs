#include <napi.h>
#include "plane.h"
#include "display_sdl.h"
#include "resources.h"

Napi::Object CreatePlane(const Napi::CallbackInfo& info) {
  return Plane::NewInstance(info.Env(), info[0]);
}

Napi::Object CreateDisplay(const Napi::CallbackInfo& info) {
  return DisplaySDL::NewInstance(info.Env(), info[0]);
}

Napi::Object CreateResources(const Napi::CallbackInfo& info) {
  return Resources::NewInstance(info.Env(), info[0]);
}

Napi::Object InitAll(Napi::Env env, Napi::Object exports) {
  exports.Set("plane",
      Napi::Function::New(env, CreatePlane, "CreatePlane"));
  exports.Set("display",
      Napi::Function::New(env, CreateDisplay, "CreateDisplay"));
  exports.Set("resources",
      Napi::Function::New(env, CreateResources, "CreateResources"));

  Napi::HandleScope scope(env);

  DisplaySDL::InitClass(env, exports);
  Plane::InitClass(env, exports);
  Resources::InitClass(env, exports);

  return exports;
}

NODE_API_MODULE(addon, InitAll)
