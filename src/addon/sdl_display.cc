#ifdef SDL_FOUND

#include "sdl_display.h"
#include "type.h"
#include "waiter.h"
#include <SDL.h>

using namespace Napi;

Napi::FunctionReference g_displayConstructor;

typedef unsigned char u8;

const int RGB_PIXEL_SIZE = 4;


void SDLDisplay::InitClass(Napi::Env env, Napi::Object exports) {
  Napi::Function func = DefineClass(
      env,
      "Display",
      {InstanceMethod("initialize", &SDLDisplay::Initialize),
       InstanceMethod("name", &SDLDisplay::Name),
       InstanceMethod("setSize", &SDLDisplay::SetSize),
       InstanceMethod("setRenderer", &SDLDisplay::SetRenderer),
       InstanceMethod("setZoom", &SDLDisplay::SetZoom),
       InstanceMethod("setGrid", &SDLDisplay::SetGrid),
       InstanceMethod("handleEvent", &SDLDisplay::HandleEvent),
       InstanceMethod("renderLoop", &SDLDisplay::RenderLoop),
       InstanceMethod("appQuit", &SDLDisplay::AppQuit),
       InstanceMethod("insteadWriteBuffer", &SDLDisplay::InsteadWriteBuffer),
  });
  g_displayConstructor = Napi::Persistent(func);
  g_displayConstructor.SuppressDestruct();
}

SDLDisplay::SDLDisplay(const Napi::CallbackInfo& info)
    : Napi::ObjectWrap<SDLDisplay>(info) {
  this->sdlInitialized = 0;
  this->zoomLevel = 1;
  this->hasWriteBuffer = 0;
  this->softwareTarget = NULL;
  this->windowHandle = NULL;
  this->rendererHandle = NULL;
  this->mainLayer0 = NULL;
  this->mainLayer1 = NULL;
  this->gridLayer = NULL;
  this->gridWidth = 0;
  this->gridHeight = 0;
  this->dataSources = NULL;
};

Napi::Object SDLDisplay::NewInstance(Napi::Env env, Napi::Value arg) {
  Napi::EscapableHandleScope scope(env);
  Napi::Object obj = g_displayConstructor.New({arg});
  return scope.Escape(napi_value(obj)).ToObject();
}

Napi::Value SDLDisplay::Initialize(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if( SDL_Init( SDL_INIT_VIDEO ) < 0 ) {
    printf("SDL could not initialize! SDL_Error: %s\n", SDL_GetError());
  } else {
    this->sdlInitialized = 1;
  }
  return Napi::Number::New(env, 0);
}

Napi::Value SDLDisplay::Name(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  return Napi::String::New(env, "sdl");
}

Napi::Value SDLDisplay::SetSize(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (info.Length() < 2) {
    printf("SetSize needs two parameters\n");
    exit(1);
  }

  this->displayWidth = info[0].ToNumber().Int32Value();
  this->displayHeight = info[1].ToNumber().Int32Value();

  return Napi::Number::New(env, 0);
}

Napi::Value SDLDisplay::SetRenderer(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (!this->sdlInitialized) {
    return Napi::Number::New(env, -1);
  }

  if (info.Length() < 1) {
    printf("SetRenderer needs renderer\n");
    exit(1);
  }

  Napi::Object rendererObj = info[0].As<Napi::Object>();
  napi_create_reference(env, rendererObj, 1, &this->rendererRef);

  return Napi::Number::New(env, 0);
}

Napi::Value SDLDisplay::SetZoom(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 1) {
    printf("SetZoom needs zoom\n");
    exit(1);
  }
  this->zoomLevel = info[0].As<Napi::Number>().Int32Value();
  return Napi::Number::New(env, 0);
}

Napi::Value SDLDisplay::SetGrid(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 1) {
    printf("SetGrid needs state\n");
    exit(1);
  }
  Napi::Value arg = info[0];
  bool value = arg.ToBoolean();
  if (value) {
    SDL_SetTextureAlphaMod(this->gridLayer, 0xff);
  } else {
    SDL_SetTextureAlphaMod(this->gridLayer, 0x00);
  }
  return Napi::Number::New(env, 0);
}

Napi::Value SDLDisplay::HandleEvent(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  Napi::String eventName = info[0].ToString();
  if (eventName.Utf8Value() == std::string("keypress")) {
    Napi::Function handleFunc = info[1].As<Napi::Function>();
    this->keyHandleFunc = Napi::Persistent(handleFunc);
  }
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

Napi::Value SDLDisplay::InsteadWriteBuffer(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  this->writeBuffer = Napi::Persistent(info[0]);
  this->hasWriteBuffer = 1;
  return Napi::Number::New(env, 0);
}

Napi::Value SDLDisplay::RenderLoop(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  this->eachFrameFunc = Napi::Persistent(info[0].As<Napi::Function>());
  // info[1] == id
  this->numRender = info[2].ToNumber().Int32Value();
  this->exitAfter = info[3].ToBoolean();

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

  int numDataSources = 0;
  this->dataSources = (unsigned char**)malloc(sizeof(unsigned char*)*3);
  this->dataSources[0] = NULL;
  this->dataSources[1] = NULL;
  this->dataSources[2] = NULL;
  int realPitch = 0;
  // TODO: Ensure layers are same size.
  // TODO: Ensure layers use same pitch.

  Napi::Object resObj = Napi::Object(env, resVal);
  numDataSources = resObj.Get("length").ToNumber().Int32Value();

  // For now, only handle up to 3 sources (2 layers + 1 grid).
  if (numDataSources > 3) {
    numDataSources = 3;
  }

  // Collect all data sources
  this->gridIndex = -1;
  for (int n = 0; n < numDataSources; n++) {
    Napi::Value surfaceVal = resObj.As<Napi::Array>()[uint32_t(n)];
    if (surfaceVal.IsNull()) {
      // grid layer, must appear last in the result
      if (n != numDataSources - 1) {
        printf("null element returned by render() at index %d intead of %d",
               n, numDataSources - 1);
        exit(1);
      }
      dataSources[n] = NULL;
      this->gridIndex = n;
      break;
    }
    Napi::Object surfaceObj = surfaceVal.As<Napi::Object>();

    Napi::Value realPitchNum = surfaceObj.Get("pitch");
    if (realPitchNum.IsNumber()) {
      realPitch = realPitchNum.As<Napi::Number>().Int32Value();
    }

    Napi::Value bufferVal = surfaceObj.Get("buff");
    if (!bufferVal.IsTypedArray()) {
      printf("bufferVal expected a TypedArray, did not get one!\n");
      exit(1);
    }
    Napi::TypedArray typeArr = bufferVal.As<Napi::TypedArray>();
    Napi::ArrayBuffer arrBuff = typeArr.ArrayBuffer();

    if (n == numDataSources - 1) {
      // grid layer
      this->gridWidth = surfaceObj.Get("width").As<Napi::Number>().Int32Value();
      this->gridHeight = surfaceObj.Get("height").As<Napi::Number>().Int32Value();
      this->gridPitch = surfaceObj.Get("pitch").As<Napi::Number>().Int32Value();
      this->gridRawBuff = (unsigned char*)arrBuff.Data();
      break;
    }

    dataSources[n] = (unsigned char*)arrBuff.Data();
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

  // Create the texture for layer 0 (lower)
  this->mainLayer0 = SDL_CreateTexture(
      this->rendererHandle,
      SDL_PIXELFORMAT_ABGR8888,
      SDL_TEXTUREACCESS_STREAMING,
      viewWidth,
      viewHeight);
  SDL_SetTextureBlendMode(this->mainLayer0, SDL_BLENDMODE_BLEND);

  // Create the texture for layer 1 (upper)
  this->mainLayer1 = SDL_CreateTexture(
      this->rendererHandle,
      SDL_PIXELFORMAT_ABGR8888,
      SDL_TEXTUREACCESS_STREAMING,
      viewWidth,
      viewHeight);
  SDL_SetTextureBlendMode(this->mainLayer1, SDL_BLENDMODE_BLEND);

  this->execOneFrame(info);
  return info.Env().Null();
}

void SDLDisplay::execOneFrame(const CallbackInfo& info) {
  Napi::Env env = info.Env();

  // Get OS events, such as exiting app, and keyboard input
  SDL_Event event;
  if (SDL_PollEvent(&event)) {
    switch (event.type) {
    case SDL_QUIT:
      // exit render loop!
      return;
    case SDL_KEYDOWN:
      if (event.key.keysym.sym == SDLK_ESCAPE) {
        // exit render loop!
        return;
      } else if (!this->keyHandleFunc.IsEmpty()) {
        int code = event.key.keysym.sym;
        std::string s(1, char(code));
        Napi::String str = Napi::String::New(env, s);
        Napi::Object obj = Napi::Object::New(env);
        obj["key"] = str;
        napi_value val = obj;
        this->keyHandleFunc.Call({val});
      }
      break;
    case SDL_WINDOWEVENT_CLOSE:
      // exit render loop!
      return;
    }
  }

  // TODO: Clean up this logic.
  if (this->numRender == 0) {
    if (this->exitAfter) {
      // Number of frames have completed, exit the app.
      return;
    }
    // This was a show() call, keep window open.
    SDL_Delay(16);
    return this->next(env);
  }

  SDL_RenderClear(this->rendererHandle);

  // Create an empty object for js function calls
  napi_value result;
  napi_value self;
  napi_status status;
  status = napi_create_object(env, &self);
  if (status != napi_ok) {
    printf("napi_create_object(self) failed to create\n");
    return;
  }

  // Call the draw function.
  napi_value funcResult;
  funcResult = this->eachFrameFunc.Call(self, 0, NULL);
  if (env.IsExceptionPending()) {
    return;
  }

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

  // Send the raw data from the plane's buffer to the texture
  if (this->dataSources[0]) {
    SDL_UpdateTexture(this->mainLayer0, NULL, this->dataSources[0], viewPitch);
  } else {
    printf("no data buffer!\n");
    return;
  }
  if (this->dataSources[1]) {
    SDL_UpdateTexture(this->mainLayer1, NULL, this->dataSources[1], viewPitch);
  }

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

  // Swap buffers to display
  SDL_RenderPresent(this->rendererHandle);

  if (this->numRender > 0) {
    this->numRender--;
  }

  this->next(env);
}


static void BeginNextFrame(const CallbackInfo& info) {
    void* data = info.Data();
    SDLDisplay* self = (SDLDisplay*)data;
    self->execOneFrame(info);
}


void SDLDisplay::next(Napi::Env env) {
  Napi::Function cont = Napi::Function::New(env, BeginNextFrame,
                                            "<unknown>", this);
  WaitWorker* w = new WaitWorker(cont, 1);
  w->Queue();
}

Napi::Value SDLDisplay::AppQuit(const Napi::CallbackInfo& info) {
  // TODO: Improve this logic
  this->numRender = 0;
  this->exitAfter = true;
  return info.Env().Null();
}

#endif
