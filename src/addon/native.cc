#include <napi.h>
#include "sdl_display.h"
#include "filesys_access.h"

Napi::Object CreateDisplay(const Napi::CallbackInfo& info) {
  return SDLDisplay::NewInstance(info.Env(), info[0]);
}

Napi::Object CreateFilesysAccess(const Napi::CallbackInfo& info) {
  return FilesysAccess::NewInstance(info.Env(), info[0]);
}

Napi::Object InitAll(Napi::Env env, Napi::Object exports) {
  exports.Set("display",
      Napi::Function::New(env, CreateDisplay, "CreateDisplay"));
  exports.Set("filesysAccess",
      Napi::Function::New(env, CreateFilesysAccess, "CreateFilesysAccess"));

  Napi::HandleScope scope(env);

  SDLDisplay::InitClass(env, exports);
  FilesysAccess::InitClass(env, exports);

  return exports;
}

NODE_API_MODULE(addon, InitAll)
