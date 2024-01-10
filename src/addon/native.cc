#include <napi.h>

#ifdef SDL_ENABLED
#include "sdl_backend.h"
#endif

#ifdef RASPBERRYPI
#include "rpi_backend.h"
#endif

#ifdef ENABLE_ADAFRUIT_HAT
#include "adafruithat_backend.h"
#endif

#include "common.h"


unsigned char* surfaceToRawBuffer(Napi::Value surfaceVal) {
  if (surfaceVal.IsNull()) {
    return NULL;
  }
  Napi::Object surfaceObj = surfaceVal.As<Napi::Object>();

  int realPitch = 0;

  Napi::Value realPitchNum = surfaceObj.Get("pitch");
  if (realPitchNum.IsNumber()) {
    realPitch = realPitchNum.As<Napi::Number>().Int32Value();
  }

  Napi::Value bufferVal = surfaceObj.Get("buff");
  if (!bufferVal.IsTypedArray()) {
    printf("bufferVal expected a TypedArray, did not get one!\n");
    return NULL;
  }
  Napi::TypedArray typeArr = bufferVal.As<Napi::TypedArray>();
  Napi::ArrayBuffer arrBuff = typeArr.ArrayBuffer();

  return (unsigned char*)arrBuff.Data();
}


void initialize(Napi::Env env, Napi::Object exports) {

  #ifdef SDL_ENABLED
  SDLBackend::InitClass(env, exports);
  #endif

  #ifdef RASPBERRYPI
  RPIBackend::InitClass(env, exports);
  #endif

  #ifdef ENABLE_ADAFRUIT_HAT
  AdafruitHatBackend::InitClass(env, exports);
  #endif
}

Napi::Object MakeBackend(const Napi::CallbackInfo& info) {
  Napi::String name = info[0].ToString();

  #ifdef SDL_ENABLED
  if (name.Utf8Value() == std::string("sdl")) {
    return SDLBackend::NewInstance(info.Env(), info[0]);
  }
  #endif

  #ifdef RASPBERRYPI
  if (name.Utf8Value() == std::string("rpi")) {
    return RPIBackend::NewInstance(info.Env(), info[0]);
  }
  #endif

  #ifdef ENABLE_ADAFRUIT_HAT
  if (name.Utf8Value() == std::string("adafruit_hat")) {
    return AdafruitHatBackend::NewInstance(info.Env(), info[0]);
  }
  #endif

  return info.Env().Null().ToObject();
}

Napi::Object Supports(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  Napi::Array list = Napi::Array::New(env);
  uint32_t i = 0;

  #ifdef SDL_ENABLED
  list[i] = "sdl";
  i++;
  #endif

  #ifdef RASPBERRYPI
  list[i] = "rpi";
  i++;
  #endif

  #ifdef ENABLE_ADAFRUIT_HAT
  list[i] = "adafruit_hat";
  i++;
  #endif

  return list;
}

Napi::Object InitAll(Napi::Env env, Napi::Object exports) {
  exports.Set("make",
      Napi::Function::New(env, MakeBackend, "MakeBackend"));
  exports.Set("supports",
      Napi::Function::New(env, Supports, "Supports"));
  Napi::HandleScope scope(env);
  initialize(env, exports);
  return exports;
}

NODE_API_MODULE(addon, InitAll)
