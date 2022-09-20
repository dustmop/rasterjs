#ifndef SDL_FOUND

#include "fake_display.h"
#include "type.h"

Napi::FunctionReference g_displayConstructor;

void FakeBackend::InitClass(Napi::Env env, Napi::Object exports) {
  Napi::Function func = DefineClass(
      env,
      "Display",
      {InstanceMethod("initialize", &FakeBackend::Initialize),
       InstanceMethod("name", &FakeBackend::Name),
       InstanceMethod("setSize", &FakeBackend::SetSize),
       InstanceMethod("setRenderer", &FakeBackend::SetRenderer),
       InstanceMethod("setZoom", &FakeBackend::SetZoom),
       InstanceMethod("setGrid", &FakeBackend::SetGrid),
       InstanceMethod("handleEvent", &FakeBackend::HandleEvent),
       InstanceMethod("renderLoop", &FakeBackend::RenderLoop),
       InstanceMethod("appQuit", &FakeBackend::AppQuit),
       InstanceMethod("insteadWriteBuffer", &FakeBackend::InsteadWriteBuffer),
  });
  g_displayConstructor = Napi::Persistent(func);
  g_displayConstructor.SuppressDestruct();
}

FakeBackend::FakeBackend(const Napi::CallbackInfo& info)
    : Napi::ObjectWrap<FakeBackend>(info) {
};

Napi::Object FakeBackend::NewInstance(Napi::Env env, Napi::Value arg) {
  Napi::EscapableHandleScope scope(env);
  Napi::Object obj = g_displayConstructor.New({arg});
  return scope.Escape(napi_value(obj)).ToObject();
}

void fail() {
  printf("FakeBackend cannot run, because the raster.js native add-on\n");
  printf("was built without SDL support\n");
  printf("\n");
  printf("you can still run scripts using `--save` and the default\n");
  printf("display (same as `--display http`) and `--display ascii`\n");
  printf("\n");
  printf("this problem can be fixed by installing the SDL\n");
  printf("development libraries, then running `npm install raster` again\n");
  printf("see: https://github.com/dustmop/rasterjs#building\n");
}

Napi::Value FakeBackend::Initialize(const Napi::CallbackInfo& info) {
  return info.Env().Null();
}

Napi::Value FakeBackend::Name(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  return Napi::String::New(env, "fake");
}

Napi::Value FakeBackend::SetSize(const Napi::CallbackInfo& info) {
  return info.Env().Null();
}

Napi::Value FakeBackend::SetRenderer(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  return env.Null();
}

Napi::Value FakeBackend::SetZoom(const Napi::CallbackInfo& info) {
  return info.Env().Null();
}

Napi::Value FakeBackend::SetGrid(const Napi::CallbackInfo& info) {
  return info.Env().Null();
}

Napi::Value FakeBackend::HandleEvent(const Napi::CallbackInfo& info) {
  return info.Env().Null();
}

Napi::Value FakeBackend::InsteadWriteBuffer(const Napi::CallbackInfo& info) {
  return info.Env().Null();
}

Napi::Value FakeBackend::RenderLoop(const Napi::CallbackInfo& info) {
  fail();
  return info.Env().Null();
}

Napi::Value FakeBackend::AppQuit(const Napi::CallbackInfo& info) {
  return info.Env().Null();
}

#endif
