#include "display_sdl.h"
#include "raw_buffer.h"
#include "resources.h"
#include "type.h"

#include <SDL.h>

using namespace Napi;

Napi::FunctionReference g_displayConstructor;

void DisplaySDL::InitClass(Napi::Env env, Napi::Object exports) {
  Napi::Function func = DefineClass(
      env,
      "Display",
      {InstanceMethod("initialize", &DisplaySDL::Initialize),
       InstanceMethod("setSource", &DisplaySDL::SetSource),
       InstanceMethod("handleEvent", &DisplaySDL::HandleEvent),
       InstanceMethod("renderLoop", &DisplaySDL::RenderLoop),
       InstanceMethod("appQuit", &DisplaySDL::AppQuit),
  });
  g_displayConstructor = Napi::Persistent(func);
  g_displayConstructor.SuppressDestruct();
}

DisplaySDL::DisplaySDL(const Napi::CallbackInfo& info)
    : Napi::ObjectWrap<DisplaySDL>(info) {
  this->sdlInitialized = 0;
  this->zoomLevel = 1;
  this->windowHandle = NULL;
  this->rendererHandle = NULL;
  this->textureHandle = NULL;
};

Napi::Object DisplaySDL::NewInstance(Napi::Env env, Napi::Value arg) {
  Napi::EscapableHandleScope scope(env);
  Napi::Object obj = g_displayConstructor.New({arg});
  return scope.Escape(napi_value(obj)).ToObject();
}

Napi::Value DisplaySDL::Initialize(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if( SDL_Init( SDL_INIT_VIDEO ) < 0 ) {
    printf("SDL could not initialize! SDL_Error: %s\n", SDL_GetError());
  } else {
    this->sdlInitialized = 1;
  }
  return Napi::Number::New(env, 0);
}

Napi::Value DisplaySDL::SetSource(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (!this->sdlInitialized) {
    return Napi::Number::New(env, -1);
  }

  if (info.Length() < 2) {
    printf("SetSource needs two parameters\n");
    exit(1);
  }

  Napi::Object planeObj = info[0].As<Napi::Object>();
  napi_create_reference(env, planeObj, 1, &this->planeRef);
  this->zoomLevel = info[1].As<Napi::Number>().Int32Value();

  return Napi::Number::New(env, 0);
}

Napi::Value DisplaySDL::HandleEvent(const Napi::CallbackInfo& info) {
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

Napi::Value DisplaySDL::RenderLoop(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if ((info.Length() < 3) || (!info[0].IsFunction()) || (!info[1].IsNumber())) {
    printf("RenderLoop argument error: want (function, number, bool)\n");
    exit(1);
  }

  Napi::Function renderFunc = info[0].As<Napi::Function>();
  int numRender = info[1].ToNumber().Int32Value();
  bool exitAfter = info[2].ToBoolean();

  // Get the stored plane object, retrieve its basic data.
  napi_value planeVal;
  napi_get_reference_value(env, this->planeRef, &planeVal);
  Napi::Object planeObj = Napi::Object(env, planeVal);
  Napi::Value widthNum = planeObj.Get("width");
  Napi::Value heightNum = planeObj.Get("height");
  Napi::Value trueBufferVal = planeObj.Get("trueBuffer");
  Napi::Function trueBufferFunc = trueBufferVal.As<Napi::Function>();

  // Get the buffer of raw data.
  napi_status status;
  napi_value buffVal;
  status = napi_call_function(env, planeObj, trueBufferFunc, 0, NULL, &buffVal);
  if (status != napi_ok) {
    printf("failed to get plane.trueBuffer!\n");
    exit(1);
  }
  Napi::Value buffObj = Napi::Value(env, buffVal);
  if (!buffObj.IsArrayBuffer()) {
    printf("plane.trueBuffer did not return an ArrayBuffer\n!");
    exit(1);
  }
  Napi::ArrayBuffer arrBuff = buffObj.As<Napi::ArrayBuffer>();

  // Calculate texture and window size.
  int viewWidth = widthNum.As<Napi::Number>().Int32Value();
  int viewHeight = heightNum.As<Napi::Number>().Int32Value();
  // TODO: Fix this
  int pitch = viewWidth*4;
  int zoomLevel = this->zoomLevel;
  int windowWidth = viewWidth * zoomLevel;
  int windowHeight = viewHeight * zoomLevel;

  // Create window
  this->windowHandle = SDL_CreateWindow(
      "RasterJS",
      SDL_WINDOWPOS_UNDEFINED,
      SDL_WINDOWPOS_UNDEFINED,
      windowWidth, windowHeight,
      SDL_WINDOW_SHOWN | SDL_WINDOW_ALLOW_HIGHDPI);
  if (this->windowHandle == NULL) {
    printf("Window could not be created! SDL_Error: %s\n", SDL_GetError());
    exit(1);
  }

  // Get window renderer
  this->rendererHandle = SDL_CreateRenderer(this->windowHandle, -1,
    SDL_RENDERER_ACCELERATED | SDL_RENDERER_PRESENTVSYNC);

  if (!this->rendererHandle) {
    printf("SDL_CreateRenderer() failed with \"%s.\"", SDL_GetError());
    return Napi::Number::New(env, -1);
  }

  // Create the texture that the plane is mapped to
  this->textureHandle = SDL_CreateTexture(
      this->rendererHandle,
      SDL_PIXELFORMAT_RGBA8888,
      SDL_TEXTUREACCESS_STREAMING,
      viewWidth,
      viewHeight);

  // Create an empty object for js function calls
  napi_value result;
  napi_value self;
  status = napi_create_object(env, &self);
  if (status != napi_ok) {
    printf("napi_create_object(self) failed to create\n");
    return Napi::Number::New(env, -1);
  }

  // Raw data from the plane's buffer
  void* untypedData = arrBuff.Data();
  unsigned char* rawBuff = (unsigned char*)untypedData;

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

    // Call the render function.
    napi_value funcResult;
    status = napi_call_function(env, self, renderFunc, 0, NULL, &funcResult);
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

    // Send the raw data from the plane's buffer to the texture
    if (rawBuff) {
      SDL_UpdateTexture(this->textureHandle, NULL, rawBuff, pitch);
    } else {
      printf("no data buffer!\n");
      return Napi::Number::New(env, 0);
    }

    SDL_RenderCopy(this->rendererHandle, this->textureHandle, NULL, NULL);
    // Swap buffers to display
    SDL_RenderPresent(this->rendererHandle);

    if (numRender > 0) {
      numRender--;
    }
  }
  return Napi::Number::New(env, 0);
}

Napi::Value DisplaySDL::AppQuit(const Napi::CallbackInfo& info) {
  this->isRunning = false;
  return info.Env().Null();
}
