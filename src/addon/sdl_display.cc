#include "sdl_display.h"
#include "type.h"

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
  this->textureHandle = NULL;
  this->gridHandle = NULL;
  this->hasGrid = 0;
  this->gridWidth = 0;
  this->gridHeight = 0;
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
    this->hasGrid = 1;
    SDL_SetTextureAlphaMod(this->gridHandle, 0xff);
  } else {
    this->hasGrid = 0;
    SDL_SetTextureAlphaMod(this->gridHandle, 0x00);
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

  Napi::Function eachFrameFunc = info[0].As<Napi::Function>();
  // info[1] == id
  int numRender = info[2].ToNumber().Int32Value();
  bool exitAfter = info[3].ToBoolean();

  // Get the stored plane object, retrieve its basic data.
  napi_value rendererVal;
  napi_get_reference_value(env, this->rendererRef, &rendererVal);
  Napi::Object rendererObj = Napi::Object(env, rendererVal);
  Napi::Value renderFuncVal = rendererObj.Get("render");

  if (!renderFuncVal.IsFunction()) {
    printf("renderer.render() not found\n");
    exit(1);
  }
  Napi::Function renderFunc = renderFuncVal.As<Napi::Function>();

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

  // Create the texture that the plane is mapped to
  this->textureHandle = SDL_CreateTexture(
      this->rendererHandle,
      SDL_PIXELFORMAT_ABGR8888,
      SDL_TEXTUREACCESS_STREAMING,
      viewWidth,
      viewHeight);
  SDL_SetTextureBlendMode(this->textureHandle, SDL_BLENDMODE_BLEND);

  // Create an empty object for js function calls
  napi_value result;
  napi_value self;
  napi_status status;
  status = napi_create_object(env, &self);
  if (status != napi_ok) {
    printf("napi_create_object(self) failed to create\n");
    return Napi::Number::New(env, -1);
  }

  // A basic main loop to handle events
  this->isRunning = true;
  SDL_Event event;
  while (this->isRunning) {
    // Get OS events, such as exiting app, and keyboard input
    if (SDL_PollEvent(&event)) {
      switch (event.type) {
      case SDL_QUIT:
        this->isRunning = false;
        break;
      case SDL_KEYDOWN:
        if (event.key.keysym.sym == SDLK_ESCAPE) {
          this->isRunning = false;
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
        this->isRunning = false;
        break;
      default:
        break;
      }
    }

    if (numRender == 0) {
      if (exitAfter) {
        // Number of frames have completed, exit the app.
        break;
      }
      // This was a show() call, keep window open.
      SDL_Delay(16);
      continue;
    }

    SDL_RenderClear(this->rendererHandle);

    // Call the draw function.
    napi_value funcResult;
    status = napi_call_function(env, self, eachFrameFunc, 0, NULL, &funcResult);

    if (status != napi_ok) {
      if (status == napi_pending_exception) {
        // Function call failed.
        napi_status s;
        s = napi_get_and_clear_last_exception(env, &result);
        napi_valuetype valuetype;
        napi_typeof(env, result, &valuetype);
        // Convert the error to a string, display it.
        napi_value errval;
        napi_coerce_to_string(env, result, &errval);
        display_napi_value(env, errval);
        break;
      }
      napi_status err;
      const napi_extended_error_info* errInfo = NULL;
      err = napi_get_last_error_info(env, &errInfo);
      if (err != napi_ok) {
        printf("Encountered an error getting error code: %d\n", err);
        break;
      }
      printf("Err code %d: %s\n", status, errInfo->error_message);
      break;
    }

    // Call the render function.
    napi_value resVal;
    status = napi_call_function(env, rendererObj, renderFunc, 0, NULL, &resVal);
    if (status != napi_ok) {
      if (status == napi_pending_exception) {
        napi_value result;
        // Function call failed.
        napi_status s;
        s = napi_get_and_clear_last_exception(env, &result);
        napi_valuetype valuetype;
        napi_typeof(env, result, &valuetype);
        // Display error with stack trace.
        Napi::Object errObj = Napi::Object(env, result);
        Napi::Value stackVal = errObj.Get("stack");
        Napi::String stackStr = stackVal.ToString();
        printf("%s\n", stackStr.Utf8Value().c_str());
        exit(1);
      }
      napi_status err;
      const napi_extended_error_info* errInfo = NULL;
      err = napi_get_last_error_info(env, &errInfo);
      if (err != napi_ok) {
        printf("Encountered an error getting error code: %d\n", err);
        exit(1);
      }
      printf("rendering failed: status code %d\n", status);
      exit(1);
    }

    Napi::Object resObj = Napi::Object(env, resVal);
    Napi::Value surfaceVal = resObj.As<Napi::Array>()[uint32_t(0)];
    Napi::Object surfaceObj = surfaceVal.As<Napi::Object>();

    unsigned char* gridRawBuff = NULL;
    int gridPitch = 0;

    Napi::Object gridLayerObj;
    Napi::Value gridLayerVal = resObj.As<Napi::Array>()[uint32_t(1)];
    if (!gridLayerVal.IsNull()) {
      gridLayerObj = gridLayerVal.As<Napi::Object>();
      if (!gridLayerObj.IsNull()) {
        Napi::Value gridBuffVal = gridLayerObj.Get("buff");
        if (!gridBuffVal.IsNull()) {
          this->hasGrid = 1;
          Napi::TypedArray typeArr = gridBuffVal.As<Napi::TypedArray>();
          Napi::ArrayBuffer arrBuff = typeArr.ArrayBuffer();
          void* untypedData = arrBuff.Data();
          gridRawBuff = (unsigned char*)untypedData;
        }
        Napi::Value gridPitchVal = gridLayerObj.Get("pitch");
        gridPitch = gridPitchVal.As<Napi::Number>().Int32Value();
        Napi::Value gridWidthVal = gridLayerObj.Get("width");
        this->gridWidth = gridWidthVal.As<Napi::Number>().Int32Value();
        Napi::Value gridHeightVal = gridLayerObj.Get("height");
        this->gridHeight = gridHeightVal.As<Napi::Number>().Int32Value();
      }
    }

    // Convert front surface into the raw data buffer
    Napi::Value bufferVal = surfaceObj.Get("buff");
    if (!bufferVal.IsTypedArray()) {
      printf("surfaceObj.buff expected a TypedArray, did not get one!\n");
      exit(1);
    }
    Napi::TypedArray typeArr = bufferVal.As<Napi::TypedArray>();
    Napi::ArrayBuffer arrBuff = typeArr.ArrayBuffer();
    void* untypedData = arrBuff.Data();
    unsigned char* rawBuff = (unsigned char*)untypedData;

    int viewPitch = viewWidth * RGB_PIXEL_SIZE;
    Napi::Value realPitchNum = surfaceObj.Get("pitch");
    if (realPitchNum.IsNumber()) {
      viewPitch = realPitchNum.As<Napi::Number>().Int32Value();
    }

    // Send the raw data from the plane's buffer to the texture
    if (rawBuff) {
      SDL_UpdateTexture(this->textureHandle, NULL, rawBuff, viewPitch);
    } else {
      printf("no data buffer!\n");
      return Napi::Number::New(env, 0);
    }

    if (gridRawBuff) {
      if (!this->gridHandle) {
        // Create the texture that the grid is mapped to
        this->gridHandle = SDL_CreateTexture(
            this->rendererHandle,
            SDL_PIXELFORMAT_ABGR8888,
            SDL_TEXTUREACCESS_STREAMING,
            this->gridWidth,
            this->gridHeight);
        SDL_SetTextureBlendMode(this->gridHandle, SDL_BLENDMODE_BLEND);
      }
      SDL_UpdateTexture(this->gridHandle, NULL, gridRawBuff, gridPitch);
    }

    SDL_RenderCopy(this->rendererHandle, this->textureHandle, NULL, NULL);
    if (this->gridHandle) {
      SDL_RenderCopy(this->rendererHandle, this->gridHandle, NULL, NULL);
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
      return Napi::Number::New(env, 0);
    }

    // Swap buffers to display
    SDL_RenderPresent(this->rendererHandle);

    if (numRender > 0) {
      numRender--;
    }
  }
  return Napi::Number::New(env, 0);
}

Napi::Value SDLDisplay::AppQuit(const Napi::CallbackInfo& info) {
  this->isRunning = false;
  return info.Env().Null();
}
