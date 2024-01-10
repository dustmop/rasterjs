#ifdef ENABLE_ADAFRUIT_HAT

#include <napi.h>

class AdafruitHatBackend : public Napi::ObjectWrap<AdafruitHatBackend> {
 public:
  static void InitClass(Napi::Env env, Napi::Object exports);
  static Napi::Object NewInstance(Napi::Env env, Napi::Value arg);
  AdafruitHatBackend(const Napi::CallbackInfo& info);
  void execOneFrame(const Napi::CallbackInfo& info);

 private:
  Napi::Value Initialize(const Napi::CallbackInfo& info);
  Napi::Value Name(const Napi::CallbackInfo& info);
  Napi::Value BeginRender(const Napi::CallbackInfo& info);
  Napi::Value Config(const Napi::CallbackInfo& info);
  Napi::Value EventReceiver(const Napi::CallbackInfo& info);
  Napi::Value RunAppLoop(const Napi::CallbackInfo& info);
  Napi::Value InsteadWriteBuffer(const Napi::CallbackInfo& info);
  Napi::Value GetFeatureList(const Napi::CallbackInfo& info);
  void next(Napi::Env env);
  void displayFrameOnHardware();

  int viewWidth;
  int viewHeight;
  int datasourcePitch;
  unsigned char* dataSource;
  napi_ref rendererRef;
  Napi::FunctionReference renderFunc;
  Napi::FunctionReference execNextFrame;
  bool isRunning;

};

#endif
