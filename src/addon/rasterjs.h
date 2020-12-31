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
  Napi::Value ResetState(const Napi::CallbackInfo& info);
  Napi::Value CreateWindow(const Napi::CallbackInfo& info);
  Napi::Value CreateDisplay(const Napi::CallbackInfo& info);
  Napi::Value HandleEvent(const Napi::CallbackInfo& info);
  Napi::Value AppRenderAndLoop(const Napi::CallbackInfo& info);
  Napi::Value AppQuit(const Napi::CallbackInfo& info);
  void StartFrame();
  void EndFrame();
  Napi::Value SetSize(const Napi::CallbackInfo& info);
  Napi::Value SetColor(const Napi::CallbackInfo& info);
  Napi::Value FillBackground(const Napi::CallbackInfo& info);
  Napi::Value SaveTo(const Napi::CallbackInfo& info);
  Napi::Value LoadImage(const Napi::CallbackInfo& info);
  Napi::Value AssignRgbMapping(const Napi::CallbackInfo& info);
  Napi::Value FillColorizedImage(const Napi::CallbackInfo& info);
  Napi::Value PutRect(const Napi::CallbackInfo& info);
  Napi::Value PutPoint(const Napi::CallbackInfo& info);
  Napi::Value PutPolygon(const Napi::CallbackInfo& info);
  Napi::Value PutLine(const Napi::CallbackInfo& info);
  Napi::Value PutImage(const Napi::CallbackInfo& info);
  Napi::Value PutCircleFromArc(const Napi::CallbackInfo& info);
  Napi::Value PutFrameMemory(const Napi::CallbackInfo& info);
  Napi::Value SaveImage(const Napi::CallbackInfo& info);

  void* priv;
};

#endif
