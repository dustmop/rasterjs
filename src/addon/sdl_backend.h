#ifndef SDL_BACKEND_H
#define SDL_BACKEND_H

#include <napi.h>
#include <chrono>

struct GfxTarget;
struct Image;
class RawBuffer;

struct SDL_Window;
struct SDL_Renderer;
struct SDL_Texture;
struct SDL_Surface;

class SDLBackend : public Napi::ObjectWrap<SDLBackend> {
 public:
  static void InitClass(Napi::Env env, Napi::Object exports);
  static Napi::Object NewInstance(Napi::Env env, Napi::Value arg);
  SDLBackend(const Napi::CallbackInfo& info);
  void execOneFrame(const Napi::CallbackInfo& info);

 private:
  Napi::Value Initialize(const Napi::CallbackInfo& info);
  Napi::Value Name(const Napi::CallbackInfo& info);
  // (width, height, renderer)
  Napi::Value BeginRender(const Napi::CallbackInfo& info);
  // (['zoom', 'grid', 'instrumentation', 'vv', 'running'], value)
  Napi::Value Config(const Napi::CallbackInfo& info);
  // ((msg, event)=>{})
  Napi::Value EventReceiver(const Napi::CallbackInfo& info);
  Napi::Value RunAppLoop(const Napi::CallbackInfo& info);
  Napi::Value InsteadWriteBuffer(const Napi::CallbackInfo& info);
  Napi::Value GetFeatureList(const Napi::CallbackInfo& info);
  Napi::Value TestOnlyHook(const Napi::CallbackInfo& info);

  void sendKeyEvent(Napi::Env env, const std::string& msg, int code);
  void sendMouseEvent(Napi::Env env, const std::string& msg, int x, int y);
  void frameInstrumentation();
  void next(Napi::Env env);
  void nextWithoutPresent(Napi::Env env);

  napi_ref rendererRef;
  Napi::FunctionReference renderFunc;
  Napi::FunctionReference execNextFrame;
  bool isRunning;

  bool hasWriteBuffer;
  Napi::Reference<Napi::Value> writeBuffer;

  Napi::FunctionReference eventReceiverFunc;
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
  SDL_Texture* mainLayer2;
  SDL_Texture* mainLayer3;
  SDL_Texture* gridLayer;
};

#endif
