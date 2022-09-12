#ifndef SDL_DISPLAY_H
#define SDL_DISPLAY_H

#include <napi.h>
#include <chrono>

struct GfxTarget;
struct Image;
class RawBuffer;

struct SDL_Window;
struct SDL_Renderer;
struct SDL_Texture;
struct SDL_Surface;

class SDLDisplay : public Napi::ObjectWrap<SDLDisplay> {
 public:
  static void InitClass(Napi::Env env, Napi::Object exports);
  static Napi::Object NewInstance(Napi::Env env, Napi::Value arg);
  SDLDisplay(const Napi::CallbackInfo& info);
  void execOneFrame(const Napi::CallbackInfo& info);

 private:
  Napi::Value Initialize(const Napi::CallbackInfo& info);
  Napi::Value Name(const Napi::CallbackInfo& info);
  Napi::Value SetSize(const Napi::CallbackInfo& info);
  Napi::Value SetRenderer(const Napi::CallbackInfo& info);
  Napi::Value SetZoom(const Napi::CallbackInfo& info);
  Napi::Value SetGrid(const Napi::CallbackInfo& info);
  Napi::Value HandleEvent(const Napi::CallbackInfo& info);
  Napi::Value InsteadWriteBuffer(const Napi::CallbackInfo& info);
  Napi::Value RenderLoop(const Napi::CallbackInfo& info);
  Napi::Value AppQuit(const Napi::CallbackInfo& info);
  Napi::Value ReadImage(const Napi::CallbackInfo& info);

  Napi::Value SetInstrumentation(const Napi::CallbackInfo& info);
  Napi::Value SetVeryVerboseTiming(const Napi::CallbackInfo& info);
  void frameInstrumentation();

  void next(Napi::Env env);
  void nextWithoutPresent(Napi::Env env);

  napi_ref rendererRef;
  Napi::FunctionReference renderFunc;
  Napi::FunctionReference eachFrameFunc;
  int numRender;
  bool exitAfter;

  bool hasWriteBuffer;
  Napi::Reference<Napi::Value> writeBuffer;

  Napi::FunctionReference keyHandleFunc;
  int sdlInitialized;
  int zoomLevel;

  int instrumentation;
  int veryVerboseTiming;

  int startupFrameCount;
  std::chrono::time_point<std::chrono::high_resolution_clock> frameStartTime;
  int tookTimeUs;
  int minDelta;
  int maxDelta;

  int gridIndex;
  int gridWidth;
  int gridHeight;
  int gridPitch;
  unsigned char* gridRawBuff;

  unsigned char** dataSources;
  int displayWidth;
  int displayHeight;

  SDL_Surface* softwareTarget;
  SDL_Window* windowHandle;
  SDL_Renderer* rendererHandle;
  SDL_Texture* mainLayer0;
  SDL_Texture* mainLayer1;
  SDL_Texture* gridLayer;
};

#endif
