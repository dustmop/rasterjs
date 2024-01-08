#ifdef SDL_ENABLED

#include "sdl_backend.h"
#include "type.h"
#include "present_frame.h"
#include "wait_frame.h"
#include <SDL.h>

using namespace Napi;

Napi::FunctionReference g_sdlDisplayConstructor;

typedef unsigned char u8;

const int RGB_PIXEL_SIZE = 4;


void SDLBackend::InitClass(Napi::Env env, Napi::Object exports) {
  Napi::Function func = DefineClass(
      env,
      "Display",
      {InstanceMethod("initialize", &SDLBackend::Initialize),
       InstanceMethod("name", &SDLBackend::Name),
       InstanceMethod("beginRender", &SDLBackend::BeginRender),
       InstanceMethod("config", &SDLBackend::Config),
       InstanceMethod("eventReceiver", &SDLBackend::EventReceiver),
       InstanceMethod("runAppLoop", &SDLBackend::RunAppLoop),
       InstanceMethod("insteadWriteBuffer", &SDLBackend::InsteadWriteBuffer),
       InstanceMethod("getFeatureList", &SDLBackend::GetFeatureList),
       InstanceMethod("testOnlyHook", &SDLBackend::TestOnlyHook),
  });
  g_sdlDisplayConstructor = Napi::Persistent(func);
  g_sdlDisplayConstructor.SuppressDestruct();
}

SDLBackend::SDLBackend(const Napi::CallbackInfo& info)
    : Napi::ObjectWrap<SDLBackend>(info) {
  this->sdlInitialized = 0;
  this->zoomLevel = 1;
  this->hasWriteBuffer = 0;
  this->softwareTarget = NULL;
  this->windowHandle = NULL;
  this->rendererHandle = NULL;
  this->mainLayer0 = NULL;
  this->mainLayer1 = NULL;
  this->mainLayer2 = NULL;
  this->mainLayer3 = NULL;
  this->gridLayer = NULL;
  this->gridWidth = 0;
  this->gridHeight = 0;
  this->gridRawBuff = NULL;
  this->dataSources = NULL;
  // TODO: properties instead of setters
  this->instrumentation = false;
  this->veryVerboseTiming = false;
  // timing the performance each frame
  this->tookTimeUs = 0;
  this->maxDelta = -9999999;
  this->minDelta = 9999999;
  // TODO: allow caller to access performance
};

Napi::Object SDLBackend::NewInstance(Napi::Env env, Napi::Value arg) {
  Napi::EscapableHandleScope scope(env);
  Napi::Object obj = g_sdlDisplayConstructor.New({arg});
  return scope.Escape(napi_value(obj)).ToObject();
}

Napi::Value SDLBackend::Initialize(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if( SDL_Init( SDL_INIT_VIDEO ) < 0 ) {
    printf("SDL could not initialize! SDL_Error: %s\n", SDL_GetError());
  } else {
    this->sdlInitialized = 1;
  }
  return Napi::Number::New(env, 0);
}

Napi::Value SDLBackend::Name(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  return Napi::String::New(env, "sdl");
}

Napi::Value SDLBackend::BeginRender(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (!this->sdlInitialized) {
    return Napi::Number::New(env, -1);
  }

  if (info.Length() < 3) {
    printf("BeginRender needs renderer\n");
    exit(1);
  }

  this->displayWidth = info[0].ToNumber().Int32Value();
  this->displayHeight = info[1].ToNumber().Int32Value();

  Napi::Object rendererObj = info[2].As<Napi::Object>();
  napi_create_reference(env, rendererObj, 1, &this->rendererRef);

  return Napi::Number::New(env, 0);
}

Napi::Value SDLBackend::Config(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (info.Length() < 2) {
    printf("Config needs two parameters\n");
    exit(1);
  }

  Napi::String fieldStr = info[0].As<Napi::String>();
  if (fieldStr.Utf8Value() == std::string("zoom")) {
    // config('zoom', num)
    if (!info[1].IsNumber()) {
      this->zoomLevel = 1;
    } else {
      this->zoomLevel = info[1].As<Napi::Number>().Int32Value();
    }

  } else if (fieldStr.Utf8Value() == std::string("grid")) {
    // config('grid', state)
    bool value = info[1].ToBoolean();
    if (!this->gridLayer) {
      // NOTE: grid layer not allocated yet
    } else if (value) {
      SDL_SetTextureAlphaMod(this->gridLayer, 0xff);
    } else {
      SDL_SetTextureAlphaMod(this->gridLayer, 0x00);
    }

  } else if (fieldStr.Utf8Value() == std::string("instrumentation")) {
    // config('instrumentation', state)
    this->instrumentation = info[1].ToNumber().Int32Value();

  } else if (fieldStr.Utf8Value() == std::string("vv")) {
    // config('grid', state)
    this->veryVerboseTiming = info[1].ToNumber().Int32Value();

  }
}

Napi::Value SDLBackend::EventReceiver(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  Napi::Function receiverFunc = info[0].As<Napi::Function>();
  this->eventReceiverFunc = Napi::Persistent(receiverFunc);
  return Napi::Number::New(env, 0);
}

void on_render(SDL_Window* window, SDL_Renderer* renderer);

void display_napi_value(Napi::Env env, napi_value value) {
  size_t size;
  char buffer[256];
  memset(buffer, 0, sizeof(buffer));
  napi_get_value_string_utf8(env, value, buffer, sizeof(buffer), &size);
  printf("%s\n", buffer);
}

Napi::Value SDLBackend::InsteadWriteBuffer(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  this->writeBuffer = Napi::Persistent(info[0]);
  this->hasWriteBuffer = 1;
  return Napi::Number::New(env, 0);
}

Napi::Value SDLBackend::GetFeatureList(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  Napi::Array features;
  return env.Null();
}

Napi::Value SDLBackend::TestOnlyHook(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  Napi::Object param = info[0].As<Napi::Object>();
  Napi::Number x = param.Get("x").As<Napi::Number>();
  Napi::Number y = param.Get("y").As<Napi::Number>();
  this->sendMouseEvent(env, "click", x.Int32Value(), y.Int32Value());
  return env.Null();
}

unsigned char* surfaceToRawBuffer(Napi::Value surfaceVal) {
  if (surfaceVal.IsNull()) {
    return NULL;
  }
  Napi::Object surfaceObj = surfaceVal.As<Napi::Object>();

  int realPitch = 0;

  Napi::Value realPitchNum = surfaceObj.Get("pitch");
  if (realPitchNum.IsNumber()) {
    realPitch = realPitchNum.As<Napi::Number>().Int32Value();
  }

  Napi::Value bufferVal = surfaceObj.Get("buff");
  if (!bufferVal.IsTypedArray()) {
    printf("bufferVal expected a TypedArray, did not get one!\n");
    return NULL;
  }
  Napi::TypedArray typeArr = bufferVal.As<Napi::TypedArray>();
  Napi::ArrayBuffer arrBuff = typeArr.ArrayBuffer();

  return (unsigned char*)arrBuff.Data();
}

Napi::Value SDLBackend::RunAppLoop(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  this->isRunning = true;

  Napi::Value runIDVal = info[0];
  this->execNextFrame = Napi::Persistent(info[1].As<Napi::Function>());

  // track the first few frames
  this->startupFrameCount = 0;

  // Get the stored plane object, retrieve its basic data.
  napi_value rendererVal;
  napi_get_reference_value(env, this->rendererRef, &rendererVal);
  Napi::Object rendererObj = Napi::Object(env, rendererVal);
  Napi::Value renderFuncVal = rendererObj.Get("render");
  if (!renderFuncVal.IsFunction()) {
    printf("renderer.render() not found\n");
    exit(1);
  }

  // Call `renderer.render()`
  Napi::Function renderFunc = renderFuncVal.As<Napi::Function>();
  Napi::Value resVal = renderFunc.Call(rendererObj, 0, NULL);
  if (env.IsExceptionPending()) {
    return info.Env().Null();
  }

  int numDataSources = 0;
  this->dataSources = (unsigned char**)malloc(sizeof(unsigned char*)*4);
  this->dataSources[0] = NULL;
  this->dataSources[1] = NULL;
  this->dataSources[2] = NULL;
  this->dataSources[3] = NULL;
  // TODO: Ensure layers are same size.
  // TODO: Ensure layers use same pitch.

  Napi::Object resObj = Napi::Object(env, resVal);
  numDataSources = resObj.Get("length").ToNumber().Int32Value();

  // For now, only handle up to 4 sources
  if (numDataSources > 4) {
    numDataSources = 4;
  }

  // Collect all data sources
  for (int n = 0; n < numDataSources; n++) {
    Napi::Value surfaceVal = resObj.As<Napi::Array>()[uint32_t(n)];
    dataSources[n] = surfaceToRawBuffer(surfaceVal);
  }
  Napi::Value surfaceVal = resObj.Get("grid");
  if (!surfaceVal.IsNull()) {
    Napi::Object surfaceObj = surfaceVal.As<Napi::Object>();
    this->gridWidth = surfaceObj.Get("width").As<Napi::Number>().Int32Value();
    this->gridHeight = surfaceObj.Get("height").As<Napi::Number>().Int32Value();
    this->gridPitch = surfaceObj.Get("pitch").As<Napi::Number>().Int32Value();
    this->gridRawBuff = surfaceToRawBuffer(surfaceVal);
  }

  // Calculate texture and window size.
  int viewWidth = this->displayWidth;
  int viewHeight = this->displayHeight;

  int zoomLevel = this->zoomLevel;
  int windowWidth = viewWidth * zoomLevel;
  int windowHeight = viewHeight * zoomLevel;

  // Calculate the flags for CreateWindow.
  // TODO: Detect whether HIGHAPI is required.
  int createWindowFlags = SDL_WINDOW_SHOWN | SDL_WINDOW_ALLOW_HIGHDPI;
  if (this->hasWriteBuffer) {
    createWindowFlags = SDL_WINDOW_MINIMIZED | SDL_WINDOW_ALLOW_HIGHDPI;
  }

  if (!this->hasWriteBuffer) {
    // Create window
    this->windowHandle = SDL_CreateWindow(
        "RasterJS",
        SDL_WINDOWPOS_UNDEFINED,
        SDL_WINDOWPOS_UNDEFINED,
        windowWidth, windowHeight,
        createWindowFlags);
    if (this->windowHandle == NULL) {
      printf("Window could not be created! SDL_Error: %s\n", SDL_GetError());
      exit(1);
    }
    // Get window renderer
    this->rendererHandle = SDL_CreateRenderer(this->windowHandle, -1,
      SDL_RENDERER_ACCELERATED | SDL_RENDERER_PRESENTVSYNC);
  } else {
    // Software renderer using an off-screen surface
    this->softwareTarget = SDL_CreateRGBSurface(
        0,
        windowWidth*2,
        windowHeight*2,
        32,
        0xff000000,
        0x00ff0000,
        0x0000ff00,
        0x000000ff);
    this->rendererHandle = SDL_CreateSoftwareRenderer(this->softwareTarget);
  }

  if (!this->rendererHandle) {
    printf("SDL_CreateRenderer() failed with \"%s.\"", SDL_GetError());
    return Napi::Number::New(env, -1);
  }

  // Create the texture for layer 0 (bottom-most)
  this->mainLayer0 = SDL_CreateTexture(
      this->rendererHandle,
      SDL_PIXELFORMAT_ABGR8888,
      SDL_TEXTUREACCESS_STREAMING,
      viewWidth,
      viewHeight);
  SDL_SetTextureBlendMode(this->mainLayer0, SDL_BLENDMODE_BLEND);

  // Create the texture for layer 1 (near-bottom)
  this->mainLayer1 = SDL_CreateTexture(
      this->rendererHandle,
      SDL_PIXELFORMAT_ABGR8888,
      SDL_TEXTUREACCESS_STREAMING,
      viewWidth,
      viewHeight);
  SDL_SetTextureBlendMode(this->mainLayer1, SDL_BLENDMODE_BLEND);

  // Create the texture for layer 2 (near-top)
  this->mainLayer2 = SDL_CreateTexture(
      this->rendererHandle,
      SDL_PIXELFORMAT_ABGR8888,
      SDL_TEXTUREACCESS_STREAMING,
      viewWidth,
      viewHeight);
  SDL_SetTextureBlendMode(this->mainLayer2, SDL_BLENDMODE_BLEND);

  // Create the texture for layer 3 (top-most)
  this->mainLayer3 = SDL_CreateTexture(
      this->rendererHandle,
      SDL_PIXELFORMAT_ABGR8888,
      SDL_TEXTUREACCESS_STREAMING,
      viewWidth,
      viewHeight);
  SDL_SetTextureBlendMode(this->mainLayer3, SDL_BLENDMODE_BLEND);

  this->execOneFrame(info);
  return info.Env().Null();
}

void SDLBackend::frameInstrumentation() {
  int frameLengthUs;
  typedef std::chrono::high_resolution_clock Clock;

  auto prevLengthUs = this->frameStartTime;
  this->frameStartTime = Clock::now();

  long frameLengthNano = std::chrono::duration_cast<std::chrono::nanoseconds>(this->frameStartTime - prevLengthUs).count();
  frameLengthUs = frameLengthNano / 1000;

  // don't count frame stats before SDL stabilizes
  if (this->startupFrameCount < 10) {
    if (this->startupFrameCount < 3) {
      this->startupFrameCount++;
      return;
    } else if (frameLengthUs < 14000) {
      this->startupFrameCount++;
      return;
    }
    this->startupFrameCount++;
  }

  if (!this->veryVerboseTiming) {
    return;
  }

  // very verbose timing
  int deltaUs = frameLengthUs - 16667;
  if (deltaUs > this->maxDelta) {
    this->maxDelta = deltaUs;
  }
  if (deltaUs < this->minDelta) {
    this->minDelta = deltaUs;
  }

  float performance = (this->tookTimeUs * 1.0 / frameLengthUs) * 100.0;
  printf("took time:     %d microseconds\n", this->tookTimeUs);
  printf("frame length:  %d microsec\n", frameLengthUs);
  printf(" max delta:    %d microsec\n", maxDelta);
  printf(" min delta:    %d microsec\n", minDelta);
  printf("* perf:        %.2f%%\n", performance);
  printf("\n");
}


void SDLBackend::execOneFrame(const CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (this->instrumentation) {
    this->frameInstrumentation();
  }

  // Get OS events, such as exiting app, and keyboard input
  SDL_Event event;
  if (SDL_PollEvent(&event)) {
    switch (event.type) {
    case SDL_QUIT:
      this->isRunning = false;
      break;

    case SDL_MOUSEBUTTONDOWN: {
      int x = event.button.x / this->zoomLevel;
      int y = event.button.y / this->zoomLevel;
      this->sendMouseEvent(env, "click", x, y);
      break;
    }

    case SDL_KEYDOWN:
      if (event.key.keysym.sym == SDLK_ESCAPE) {
        this->isRunning = false;
        return;
      }
      this->sendKeyEvent(env, "keydown", event.key.keysym.sym);
      if (env.IsExceptionPending()) {
        return;
      }
      break;

    case SDL_KEYUP:
      this->sendKeyEvent(env, "keyup", event.key.keysym.sym);
      if (env.IsExceptionPending()) {
        return;
      }
      break;

    case SDL_WINDOWEVENT_CLOSE:
      this->isRunning = false;
      return;
    }
  }

  if (!this->isRunning) {
    // exit render loop!
    return;
  }

  // create an empty object for js function calls
  napi_value self;
  napi_status status;
  status = napi_create_object(env, &self);
  if (status != napi_ok) {
    printf("napi_create_object(self) failed to create\n");
    return;
  }

  // call the executor
  napi_value needRenderVal;
  needRenderVal = this->execNextFrame.Call(self, 0, NULL);
  if (env.IsExceptionPending()) {
    return;
  }

  Napi::Value needRenderObj = Napi::Value(env, needRenderVal);
  Napi::Boolean needRender = needRenderObj.ToBoolean();

  // if no need to render, exit early
  if (!needRender) {
    this->nextWithoutPresent(env);
    return;
  }

  SDL_RenderClear(this->rendererHandle);

  // Call the render function.
  napi_value resVal;
  napi_get_reference_value(env, this->rendererRef, &resVal);
  Napi::Object rendererObj = Napi::Object(env, resVal);
  Napi::Value renderFuncVal = rendererObj.Get("render");
  if (!renderFuncVal.IsFunction()) {
    printf("renderer.render() not found\n");
    exit(1);
  }
  Napi::Function renderFunc = renderFuncVal.As<Napi::Function>();
  resVal = renderFunc.Call(rendererObj, 0, NULL);
  if (env.IsExceptionPending()) {
    return;
  }

  // Get the pitch of the first layer, assume it is constant.
  // TODO: Fix this assumption
  Napi::Object resObj = Napi::Object(env, resVal);
  Napi::Value surfaceVal = resObj.As<Napi::Array>()[uint32_t(0)];
  Napi::Object surfaceObj = surfaceVal.As<Napi::Object>();
  Napi::Value realPitchNum = surfaceObj.Get("pitch");

  int viewHeight = this->displayHeight;
  int viewWidth = this->displayWidth;
  int viewPitch = viewWidth * RGB_PIXEL_SIZE;
  if (realPitchNum.IsNumber()) {
    viewPitch = realPitchNum.As<Napi::Number>().Int32Value();
  }

  // present the raw data from the plane's buffer to the texture
  if (this->dataSources[0]) {
    SDL_UpdateTexture(this->mainLayer0, NULL, this->dataSources[0], viewPitch);
  } else {
    printf("no data buffer!\n");
    return;
  }
  if (this->dataSources[1]) {
    SDL_UpdateTexture(this->mainLayer1, NULL, this->dataSources[1], viewPitch);
  }
  if (this->dataSources[2]) {
    SDL_UpdateTexture(this->mainLayer2, NULL, this->dataSources[2], viewPitch);
  }
  if (this->dataSources[3]) {
    SDL_UpdateTexture(this->mainLayer3, NULL, this->dataSources[3], viewPitch);
  }

  // create grid if renderer returns one
  if (this->gridRawBuff) {
    if (!this->gridLayer) {
      // Create the texture that the grid is mapped to
      this->gridLayer = SDL_CreateTexture(
          this->rendererHandle,
          SDL_PIXELFORMAT_ABGR8888,
          SDL_TEXTUREACCESS_STREAMING,
          this->gridWidth,
          this->gridHeight);
      SDL_SetTextureBlendMode(this->gridLayer, SDL_BLENDMODE_BLEND);
    }
    SDL_UpdateTexture(this->gridLayer, NULL, this->gridRawBuff, this->gridPitch);
  }

  SDL_RenderCopy(this->rendererHandle, this->mainLayer0, NULL, NULL);
  if (this->mainLayer1 && this->dataSources[1]) {
    SDL_RenderCopy(this->rendererHandle, this->mainLayer1, NULL, NULL);
  }
  if (this->mainLayer2 && this->dataSources[2]) {
    SDL_RenderCopy(this->rendererHandle, this->mainLayer2, NULL, NULL);
  }
  if (this->mainLayer3 && this->dataSources[3]) {
    SDL_RenderCopy(this->rendererHandle, this->mainLayer3, NULL, NULL);
  }
  if (this->gridLayer) {
    SDL_RenderCopy(this->rendererHandle, this->gridLayer, NULL, NULL);
  }

  if (this->hasWriteBuffer) {
    // TODO: 2 is only true if high dpi is enabled
    int width = this->displayWidth * this->zoomLevel * 2;
    int height = this->displayHeight * this->zoomLevel * 2;
    SDL_Rect rect;
    rect.x = rect.y = 0;
    rect.w = width;
    rect.h = height;
    int savePitch = width * 4;
    int saveSize = width * height * 4;
    u8* saveBuff = (u8*)malloc(saveSize);
    SDL_RenderReadPixels(this->rendererHandle,
                         &rect,
                         SDL_PIXELFORMAT_ABGR8888,
                         saveBuff,
                         savePitch);
    // Copy the result into the hook buffer.
    Napi::Value bufferVal = this->writeBuffer.Value();
    Napi::TypedArray typeArr = bufferVal.As<Napi::TypedArray>();
    Napi::ArrayBuffer arrBuff = typeArr.ArrayBuffer();
    void* untypedData = arrBuff.Data();
    unsigned char* rawBuff = (unsigned char*)untypedData;
    for (size_t k = 0; k < arrBuff.ByteLength(); k++) {
      rawBuff[k] = saveBuff[k];
    }
    free(saveBuff);
    return;
  }

  this->next(env);
}


void SDLBackend::sendKeyEvent(Napi::Env env, const std::string& msg, int code) {
  if (this->eventReceiverFunc.IsEmpty()) {
    return;
  }
  if (code & 0x40000000) {
    code = (code & 0xff) | 0x8000;
  } else {
    code = code & 0xff;
  }
  Napi::Object obj = Napi::Object::New(env);
  Napi::Number codeNum = Napi::Number::New(env, code);
  obj["code"] = codeNum;
  napi_value val = obj;
  Napi::String eventName = Napi::String::New(env, msg);
  this->eventReceiverFunc.Call({eventName, val});
}


void SDLBackend::sendMouseEvent(Napi::Env env, const std::string& msg,
                                int x, int y) {
  if (this->eventReceiverFunc.IsEmpty()) {
    return;
  }
  Napi::Object obj = Napi::Object::New(env);
  Napi::Number xNum = Napi::Number::New(env, x);
  Napi::Number yNum = Napi::Number::New(env, y);
  obj["basex"] = xNum;
  obj["basey"] = yNum;
  napi_value val = obj;
  Napi::String eventName = Napi::String::New(env, msg);
  this->eventReceiverFunc.Call({eventName, val});
}


static void BeginNextFrame(const CallbackInfo& info) {
  void* data = info.Data();
  SDLBackend* self = (SDLBackend*)data;
  self->execOneFrame(info);
}


void SDLBackend::next(Napi::Env env) {
  Napi::Function cont = Napi::Function::New(env, BeginNextFrame,
                                            "<unknown>", this);
  // time how long this frame took to execute and render
  typedef std::chrono::high_resolution_clock Clock;
  auto finishTime = Clock::now();
  long durationNano = std::chrono::duration_cast<std::chrono::nanoseconds>(finishTime - this->frameStartTime).count();
  this->tookTimeUs = (durationNano / 1000);
  // asynchronously present the frame to SDL
  PresentFrame* w = new PresentFrame(cont, this->rendererHandle);
  w->Queue();
}

void SDLBackend::nextWithoutPresent(Napi::Env env) {
  Napi::Function cont = Napi::Function::New(env, BeginNextFrame,
                                            "<unknown>", this);
  WaitFrame* w = new WaitFrame(cont, 16);
  w->Queue();
}

#endif
