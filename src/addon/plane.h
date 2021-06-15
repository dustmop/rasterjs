#ifndef PLANE_H
#define PLANE_H

#include "type.h"
#include <cstdint>
#include <napi.h>

class DisplaySDL;
class Resources;

class Plane : public Napi::ObjectWrap<Plane> {
 public:
  static void InitClass(Napi::Env env, Napi::Object exports);
  static Napi::Object NewInstance(Napi::Env env, Napi::Value arg);
  Plane(const Napi::CallbackInfo& info);
  void BeginFrame();
  void Finish(const Napi::Env& env);

 private:
  Napi::Value Clear(const Napi::CallbackInfo& info);
  Napi::Value GetWidth(const Napi::CallbackInfo &info);
  Napi::Value GetHeight(const Napi::CallbackInfo &info);
  Napi::Value AsBuffer(const Napi::CallbackInfo &info);
  Napi::Value SetSize(const Napi::CallbackInfo& info);
  Napi::Value SetColor(const Napi::CallbackInfo& info);
  Napi::Value FillBackground(const Napi::CallbackInfo& info);
  Napi::Value RetrieveTrueContent(const Napi::CallbackInfo& info);
  Napi::Value SaveTo(const Napi::CallbackInfo& info);
  Napi::Value AssignRgbMap(const Napi::CallbackInfo& info);
  Napi::Value ClearRgbMap(const Napi::CallbackInfo& info);
  Napi::Value AddRgbMapEntry(const Napi::CallbackInfo& info);
  Napi::Value PutRect(const Napi::CallbackInfo& info);
  Napi::Value PutDot(const Napi::CallbackInfo& info);
  Napi::Value PutSequence(const Napi::CallbackInfo& info);
  Napi::Value PutImage(const Napi::CallbackInfo& info);
  Napi::Value PutFrameMemory(const Napi::CallbackInfo& info);
  Napi::Value PutColorChange(const Napi::CallbackInfo& info);

  void prepare(const Napi::Env& env);
  void fillTarget(GfxTarget* t);

  // Configuration, safe defaults.
  int rgbMapIndex;
  int rgbMapSize;
  int rgbMap[256];
  uint32_t frontColor;
  uint32_t backColor;
 public:
  // lazy allocation of buffer
  int rowSize;
  int numElems;
  uint32_t* rawBuff;
  // reference to js friendly array buffer
  napi_ref arrayBuff;
  //
  int width;
  int height;
  int needErase;
  Resources* res;
};

#endif
