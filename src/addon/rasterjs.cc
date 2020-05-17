#include "rasterjs.h"
#include <napi.h>
#include <uv.h>

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

Napi::Value RasterJS::CallOne(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  printf("one\n");
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
