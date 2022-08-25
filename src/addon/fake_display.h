#ifndef FAKE_DISPLAY_H
#define FAKE_DISPLAY_H

#include <napi.h>

class FakeDisplay : public Napi::ObjectWrap<FakeDisplay> {
 public:
  static void InitClass(Napi::Env env, Napi::Object exports);
  static Napi::Object NewInstance(Napi::Env env, Napi::Value arg);
  FakeDisplay(const Napi::CallbackInfo& info);

 private:
  Napi::Value Initialize(const Napi::CallbackInfo& info);
  Napi::Value Name(const Napi::CallbackInfo& info);
  Napi::Value SetSize(const Napi::CallbackInfo& info);
  Napi::Value SetRenderer(const Napi::CallbackInfo& info);
  Napi::Value SetZoom(const Napi::CallbackInfo& info);
  Napi::Value SetGrid(const Napi::CallbackInfo& info);
  Napi::Value HandleEvent(const Napi::CallbackInfo& info);
  Napi::Value InsteadWriteBuffer(const Napi::CallbackInfo& info);
  Napi::Value RenderLoop(const Napi::CallbackInfo& info);
  Napi::Value AppQuit(const Napi::CallbackInfo& info);
  Napi::Value ReadImage(const Napi::CallbackInfo& info);

  Napi::Value SetInstrumentation(const Napi::CallbackInfo& info);
  Napi::Value SetVeryVerboseTiming(const Napi::CallbackInfo& info);
};

#endif
