#ifndef SDL_DISPLAY_H
#define SDL_DISPLAY_H

#include <napi.h>
#include "plane.h"


struct GfxTarget;

class SDLDisplay : public Napi::ObjectWrap<SDLDisplay> {
 public:
  static void InitClass(Napi::Env env, Napi::Object exports);
  static Napi::Object NewInstance(Napi::Env env, Napi::Value arg);
  SDLDisplay(const Napi::CallbackInfo& info);

 private:
  Napi::Value Initialize(const Napi::CallbackInfo& info);
  Napi::Value CreateWindow(const Napi::CallbackInfo& info);
  Napi::Value CreateDisplay(const Napi::CallbackInfo& info);
  Napi::Value HandleEvent(const Napi::CallbackInfo& info);
  Napi::Value AppRenderAndLoop(const Napi::CallbackInfo& info);
  Napi::Value AppQuit(const Napi::CallbackInfo& info);
  Napi::Value LoadImage(const Napi::CallbackInfo& info);
  void StartFrame();
  void EndFrame();

  Napi::FunctionReference keyHandleFunc;
  bool is_running;
  int sdl_initialized;
  int windowWidth;
  int windowHeight;
  Plane* renderPlane;
};

/*
PrivateState::PrivateState() {

  //printf("Napi::PrivateState::ctor\n");

  this->rgb_map_length = 0;
  this->frontColor = 0xffffffff;
  this->backColor = 0;
  this->drawTarget = NULL;
  this->allocTarget = NULL;
}

};
*/

#endif
