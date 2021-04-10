#ifndef SDL_DISPLAY_H
#define SDL_DISPLAY_H

#include <napi.h>

struct GfxTarget;
struct Image;
class Plane;

class SDLDisplay : public Napi::ObjectWrap<SDLDisplay> {
 public:
  static void InitClass(Napi::Env env, Napi::Object exports);
  static Napi::Object NewInstance(Napi::Env env, Napi::Value arg);
  SDLDisplay(const Napi::CallbackInfo& info);

  int numImages();
  Image* getImage(int num);

 private:
  Napi::Value Initialize(const Napi::CallbackInfo& info);
  Napi::Value CreateWindow(const Napi::CallbackInfo& info);
  Napi::Value CreateDisplay(const Napi::CallbackInfo& info);
  Napi::Value HandleEvent(const Napi::CallbackInfo& info);
  Napi::Value AppRenderAndLoop(const Napi::CallbackInfo& info);
  Napi::Value AppQuit(const Napi::CallbackInfo& info);
  Napi::Value ReadImage(const Napi::CallbackInfo& info);
  void StartFrame();
  void EndFrame();

  Napi::FunctionReference keyHandleFunc;
  bool is_running;
  int sdl_initialized;
  int windowWidth;
  int windowHeight;
  Plane* renderPlane;
  std::vector<Image*> imgList;
};

#endif
