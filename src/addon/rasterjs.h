#ifndef RASTERJS_H
#define RASTERJS_H

#include <napi.h>

class RasterJS : public Napi::ObjectWrap<RasterJS> {
 public:
  static Napi::Object Init(Napi::Env env, Napi::Object exports);
  static Napi::Object NewInstance(Napi::Env env, Napi::Value arg);
  RasterJS(const Napi::CallbackInfo& info);

 private:
  static Napi::FunctionReference constructor;
  Napi::Value Initialize(const Napi::CallbackInfo& info);
  Napi::Value CreateWindow(const Napi::CallbackInfo& info);
  Napi::Value RenderLoop(const Napi::CallbackInfo& info);
  void StartFrame();
  Napi::Value SetColor(const Napi::CallbackInfo& info);
  Napi::Value DrawRect(const Napi::CallbackInfo& info);
  Napi::Value DrawPolygon(const Napi::CallbackInfo& info);
  Napi::Value DrawLine(const Napi::CallbackInfo& info);
  Napi::Value FillBackground(const Napi::CallbackInfo& info);
  Napi::Value LoadImage(const Napi::CallbackInfo& info);
  Napi::Value DrawImage(const Napi::CallbackInfo& info);
  Napi::Value DrawCircleFromArc(const Napi::CallbackInfo& info);

  int drawColor;
};

#endif
