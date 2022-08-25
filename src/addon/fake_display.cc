#ifndef SDL_FOUND

#include "fake_display.h"
#include "type.h"

Napi::FunctionReference g_displayConstructor;

void FakeDisplay::InitClass(Napi::Env env, Napi::Object exports) {
  Napi::Function func = DefineClass(
      env,
      "Display",
      {InstanceMethod("initialize", &FakeDisplay::Initialize),
       InstanceMethod("name", &FakeDisplay::Name),
       InstanceMethod("setSize", &FakeDisplay::SetSize),
       InstanceMethod("setRenderer", &FakeDisplay::SetRenderer),
       InstanceMethod("setZoom", &FakeDisplay::SetZoom),
       InstanceMethod("setGrid", &FakeDisplay::SetGrid),
       InstanceMethod("handleEvent", &FakeDisplay::HandleEvent),
       InstanceMethod("renderLoop", &FakeDisplay::RenderLoop),
       InstanceMethod("appQuit", &FakeDisplay::AppQuit),
       InstanceMethod("insteadWriteBuffer", &FakeDisplay::InsteadWriteBuffer),
  });
  g_displayConstructor = Napi::Persistent(func);
  g_displayConstructor.SuppressDestruct();
}

FakeDisplay::FakeDisplay(const Napi::CallbackInfo& info)
    : Napi::ObjectWrap<FakeDisplay>(info) {
};

Napi::Object FakeDisplay::NewInstance(Napi::Env env, Napi::Value arg) {
  Napi::EscapableHandleScope scope(env);
  Napi::Object obj = g_displayConstructor.New({arg});
  return scope.Escape(napi_value(obj)).ToObject();
}

void fail() {
  printf("FakeDisplay cannot run, because the raster.js native add-on\n");
  printf("was built without SDL support\n");
  printf("\n");
  printf("you can still run scripts using `--save` and the default\n");
  printf("display (same as `--display http`)\n");
  printf("\n");
  printf("this problem can be fixed by installing the SDL\n");
  printf("development libraries, then running `npm install raster` again\n");
  printf("see: https://github.com/dustmop/rasterjs#building\n");
}

Napi::Value FakeDisplay::Initialize(const Napi::CallbackInfo& info) {
  return info.Env().Null();
}

Napi::Value FakeDisplay::Name(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  return Napi::String::New(env, "fake");
}

Napi::Value FakeDisplay::SetSize(const Napi::CallbackInfo& info) {
  return info.Env().Null();
}

Napi::Value FakeDisplay::SetRenderer(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  return env.Null();
}

Napi::Value FakeDisplay::SetZoom(const Napi::CallbackInfo& info) {
  return info.Env().Null();
}

Napi::Value FakeDisplay::SetGrid(const Napi::CallbackInfo& info) {
  return info.Env().Null();
}

Napi::Value FakeDisplay::HandleEvent(const Napi::CallbackInfo& info) {
  return info.Env().Null();
}

Napi::Value FakeDisplay::InsteadWriteBuffer(const Napi::CallbackInfo& info) {
  return info.Env().Null();
}

Napi::Value FakeDisplay::RenderLoop(const Napi::CallbackInfo& info) {
  fail();
  return info.Env().Null();
}

Napi::Value FakeDisplay::AppQuit(const Napi::CallbackInfo& info) {
  return info.Env().Null();
}

#endif
