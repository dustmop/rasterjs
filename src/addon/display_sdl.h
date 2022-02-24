#ifndef DISPLAY_SDL_H
#define DISPLAY_SDL_H

#include <napi.h>

struct GfxTarget;
struct Image;
class RawBuffer;

struct SDL_Window;
struct SDL_Renderer;
struct SDL_Texture;
struct SDL_Surface;

class DisplaySDL : public Napi::ObjectWrap<DisplaySDL> {
 public:
  static void InitClass(Napi::Env env, Napi::Object exports);
  static Napi::Object NewInstance(Napi::Env env, Napi::Value arg);
  DisplaySDL(const Napi::CallbackInfo& info);

 private:
  Napi::Value Initialize(const Napi::CallbackInfo& info);
  Napi::Value SetSize(const Napi::CallbackInfo& info);
  Napi::Value SetRenderer(const Napi::CallbackInfo& info);
  Napi::Value SetZoom(const Napi::CallbackInfo& info);
  Napi::Value SetGrid(const Napi::CallbackInfo& info);
  Napi::Value HandleEvent(const Napi::CallbackInfo& info);
  Napi::Value InsteadSaveFile(const Napi::CallbackInfo& info);
  Napi::Value RenderLoop(const Napi::CallbackInfo& info);
  Napi::Value AppQuit(const Napi::CallbackInfo& info);
  Napi::Value ReadImage(const Napi::CallbackInfo& info);

  Napi::FunctionReference keyHandleFunc;
  bool isRunning;
  int sdlInitialized;
  napi_ref rendererRef;
  int zoomLevel;
  int gridUnit;

  std::string hookSaveFile;

  int displayWidth;
  int displayHeight;

  SDL_Surface* softwareTarget;
  SDL_Window* windowHandle;
  SDL_Renderer* rendererHandle;
  SDL_Texture* textureHandle;
  SDL_Texture* gridHandle;
};

#endif
