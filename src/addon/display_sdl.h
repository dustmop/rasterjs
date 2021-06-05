#ifndef DISPLAY_SDL_H
#define DISPLAY_SDL_H

#include <napi.h>

struct GfxTarget;
struct Image;
class Plane;

struct SDL_Window;
struct SDL_Renderer;
struct SDL_Texture;

class DisplaySDL : public Napi::ObjectWrap<DisplaySDL> {
 public:
  static void InitClass(Napi::Env env, Napi::Object exports);
  static Napi::Object NewInstance(Napi::Env env, Napi::Value arg);
  DisplaySDL(const Napi::CallbackInfo& info);

 private:
  Napi::Value Initialize(const Napi::CallbackInfo& info);
  Napi::Value SetSource(const Napi::CallbackInfo& info);
  Napi::Value HandleEvent(const Napi::CallbackInfo& info);
  Napi::Value RenderLoop(const Napi::CallbackInfo& info);
  Napi::Value AppQuit(const Napi::CallbackInfo& info);
  Napi::Value ReadImage(const Napi::CallbackInfo& info);
  void StartFrame();
  void EndFrame();

  Napi::FunctionReference keyHandleFunc;
  bool isRunning;
  int sdlInitialized;
  int windowWidth;
  int windowHeight;
  Plane* renderPlane;

  SDL_Window* windowHandle;
  SDL_Renderer* rendererHandle;
  SDL_Texture* textureHandle;
};

#endif
