#ifndef FILESYS_ACCESS_H
#define FILESYS_ACCESS_H

#include <cstdint>
#include <napi.h>

struct Image;

class FilesysAccess : public Napi::ObjectWrap<FilesysAccess> {
 public:
  static void InitClass(Napi::Env env, Napi::Object exports);
  static Napi::Object NewInstance(Napi::Env env, Napi::Value arg);
  FilesysAccess(const Napi::CallbackInfo& info);

  Napi::Value Clear(const Napi::CallbackInfo& info);
  Napi::Value OpenImage(const Napi::CallbackInfo& info);
  Napi::Value OpenText(const Napi::CallbackInfo& info);
  Napi::Value SaveTo(const Napi::CallbackInfo& info);
  Napi::Value WhenLoaded(const Napi::CallbackInfo& info);

};

#endif
