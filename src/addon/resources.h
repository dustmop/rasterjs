#ifndef RESOURCES_H
#define RESOURCES_H

#include <cstdint>
#include <napi.h>

struct Image;

class Resources : public Napi::ObjectWrap<Resources> {
 public:
  static void InitClass(Napi::Env env, Napi::Object exports);
  static Napi::Object NewInstance(Napi::Env env, Napi::Value arg);
  Resources(const Napi::CallbackInfo& info);

  Napi::Value Clear(const Napi::CallbackInfo& info);
  Napi::Value OpenImage(const Napi::CallbackInfo& info);
  Napi::Value OpenText(const Napi::CallbackInfo& info);
  Napi::Value SaveTo(const Napi::CallbackInfo& info);
  Napi::Value AllLoaded(const Napi::CallbackInfo& info);

};

#endif
