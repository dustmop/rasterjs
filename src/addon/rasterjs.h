#ifndef QUICK_GRAPHICS_H
#define QUICK_GRAPHICS_H

#include <napi.h>

class RasterJS : public Napi::ObjectWrap<RasterJS> {
 public:
  static Napi::Object Init(Napi::Env env, Napi::Object exports);
  static Napi::Object NewInstance(Napi::Env env, Napi::Value arg);
  RasterJS(const Napi::CallbackInfo& info);

 private:
  static Napi::FunctionReference constructor;
  Napi::Value SDLInit(const Napi::CallbackInfo& info);
  Napi::Value CreateWindow(const Napi::CallbackInfo& info);
  Napi::Value RenderLoop(const Napi::CallbackInfo& info);
  double counter_;
};

#endif
