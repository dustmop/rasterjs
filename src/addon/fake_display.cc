#ifndef SDL_FOUND

#include "sdl_display.h"
#include "type.h"
#include "waiter.h"

Napi::FunctionReference g_displayConstructor;

void SDLDisplay::InitClass(Napi::Env env, Napi::Object exports) {
  Napi::Function func = DefineClass(
      env,
      "Display",
      {InstanceMethod("initialize", &SDLDisplay::Initialize),
       InstanceMethod("name", &SDLDisplay::Name),
       InstanceMethod("setSize", &SDLDisplay::SetSize),
       InstanceMethod("setRenderer", &SDLDisplay::SetRenderer),
       InstanceMethod("setZoom", &SDLDisplay::SetZoom),
       InstanceMethod("setGrid", &SDLDisplay::SetGrid),
       InstanceMethod("handleEvent", &SDLDisplay::HandleEvent),
       InstanceMethod("renderLoop", &SDLDisplay::RenderLoop),
       InstanceMethod("appQuit", &SDLDisplay::AppQuit),
       InstanceMethod("insteadWriteBuffer", &SDLDisplay::InsteadWriteBuffer),
  });
  g_displayConstructor = Napi::Persistent(func);
  g_displayConstructor.SuppressDestruct();
}

SDLDisplay::SDLDisplay(const Napi::CallbackInfo& info)
    : Napi::ObjectWrap<SDLDisplay>(info) {
};

Napi::Object SDLDisplay::NewInstance(Napi::Env env, Napi::Value arg) {
  Napi::EscapableHandleScope scope(env);
  Napi::Object obj = g_displayConstructor.New({arg});
  return scope.Escape(napi_value(obj)).ToObject();
}

void fail() {
  printf("SDLDisplay cannot run, because the raster.js native add-on\n");
  printf("was built without SDL support\n");
  printf("\n");
  printf("you can still run scripts using `--save` and the default\n");
  printf("display (same as `--display http`)\n");
  printf("\n");
  printf("this problem can be fixed by installing the SDL\n");
  printf("development libraries, then running `npm install raster` again\n");
  printf("see: https://github.com/dustmop/rasterjs#building\n");
}

Napi::Value SDLDisplay::Initialize(const Napi::CallbackInfo& info) {
  return info.Env().Null();
}

Napi::Value SDLDisplay::Name(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  return Napi::String::New(env, "fake");
}

Napi::Value SDLDisplay::SetSize(const Napi::CallbackInfo& info) {
  return info.Env().Null();
}

Napi::Value SDLDisplay::SetRenderer(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  return env.Null();
}

Napi::Value SDLDisplay::SetZoom(const Napi::CallbackInfo& info) {
  return info.Env().Null();
}

Napi::Value SDLDisplay::SetGrid(const Napi::CallbackInfo& info) {
  return info.Env().Null();
}

Napi::Value SDLDisplay::HandleEvent(const Napi::CallbackInfo& info) {
  return info.Env().Null();
}

Napi::Value SDLDisplay::InsteadWriteBuffer(const Napi::CallbackInfo& info) {
  return info.Env().Null();
}

Napi::Value SDLDisplay::RenderLoop(const Napi::CallbackInfo& info) {
  fail();
  return info.Env().Null();
}

Napi::Value SDLDisplay::AppQuit(const Napi::CallbackInfo& info) {
  return info.Env().Null();
}

#endif
