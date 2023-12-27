#ifdef RASPBERRYPI

#include <napi.h>

class RPIBackend : public Napi::ObjectWrap<RPIBackend> {
 public:
  static void InitClass(Napi::Env env, Napi::Object exports);
  static Napi::Object NewInstance(Napi::Env env, Napi::Value arg);
  RPIBackend(const Napi::CallbackInfo& info);

 private:
  Napi::Value Initialize(const Napi::CallbackInfo& info);
  Napi::Value Name(const Napi::CallbackInfo& info);
  Napi::Value BeginRender(const Napi::CallbackInfo& info);
  Napi::Value Config(const Napi::CallbackInfo& info);
  Napi::Value EventReceiver(const Napi::CallbackInfo& info);
  Napi::Value RunAppLoop(const Napi::CallbackInfo& info);
  Napi::Value InsteadWriteBuffer(const Napi::CallbackInfo& info);
};

#endif
