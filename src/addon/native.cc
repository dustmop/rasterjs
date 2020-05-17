#include <napi.h>
#include "rasterjs.h"

Napi::Object CreateRasterJS(const Napi::CallbackInfo& info) {
  return RasterJS::NewInstance(info.Env(), info[0]);
}

Napi::Object InitAll(Napi::Env env, Napi::Object exports) {
  Napi::Object new_exports =
      Napi::Function::New(env, CreateRasterJS, "CreateRasterJS");
  return RasterJS::Init(env, new_exports);
}

NODE_API_MODULE(addon, InitAll)
