#include "sdl_display.h"
#include "plane.h"

#include "gfx_types.h"
#include "load_image.h"

#include <SDL.h>

using namespace Napi;

Napi::FunctionReference g_displayConstructor;

void SDLDisplay::InitClass(Napi::Env env, Napi::Object exports) {
  Napi::Function func = DefineClass(
      env,
      "Display",
      {InstanceMethod("initialize", &SDLDisplay::Initialize),
       InstanceMethod("createWindow", &SDLDisplay::CreateWindow),
       InstanceMethod("createDisplay", &SDLDisplay::CreateDisplay),
       InstanceMethod("handleEvent", &SDLDisplay::HandleEvent),
       InstanceMethod("appRenderAndLoop", &SDLDisplay::AppRenderAndLoop),
       InstanceMethod("appQuit", &SDLDisplay::AppQuit),
       InstanceMethod("readImage", &SDLDisplay::ReadImage),
  });
  g_displayConstructor = Napi::Persistent(func);
  g_displayConstructor.SuppressDestruct();
}

SDLDisplay::SDLDisplay(const Napi::CallbackInfo& info)
    : Napi::ObjectWrap<SDLDisplay>(info) {
  this->sdlInitialized = 0;
  this->windowWidth = 0;
  this->windowHeight = 0;
  this->renderPlane = NULL;
  this->windowHandle = NULL;
  this->rendererHandle = NULL;
  this->textureHandle = NULL;
};

Napi::Object SDLDisplay::NewInstance(Napi::Env env, Napi::Value arg) {
  Napi::EscapableHandleScope scope(env);
  Napi::Object obj = g_displayConstructor.New({arg});
  return scope.Escape(napi_value(obj)).ToObject();
}

Napi::Value SDLDisplay::Initialize(const Napi::CallbackInfo& info) {
  this->renderPlane = NULL;
  Napi::Env env = info.Env();
  if( SDL_Init( SDL_INIT_VIDEO ) < 0 ) {
    printf("SDL could not initialize! SDL_Error: %s\n", SDL_GetError());
  } else {
    this->sdlInitialized = 1;
  }
  return Napi::Number::New(env, 0);
}

Napi::Value SDLDisplay::CreateWindow(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (!this->sdlInitialized) {
    return Napi::Number::New(env, -1);
  }

  if (info.Length() < 2) {
    printf("CreateWindow needs two parameters\n");
    exit(1);
  }

  Napi::Object planeObj = info[0].As<Napi::Object>();
  Plane* plane = Napi::ObjectWrap<Plane>::Unwrap(planeObj);
  this->renderPlane = plane;

  int zoomLevel = info[1].As<Napi::Number>().Int32Value();
  this->windowWidth = this->renderPlane->width * zoomLevel;
  this->windowHeight = this->renderPlane->height * zoomLevel;

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
  return Napi::Number::New(env, 0);
}

Napi::Value SDLDisplay::CreateDisplay(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  // TODO: Implement me?
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

Napi::Value SDLDisplay::AppRenderAndLoop(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (!this->sdlInitialized || !this->windowHandle) {
    return Napi::Number::New(env, -1);
  }

  if ((info.Length() < 2) || (!info[0].IsFunction()) || (!info[1].IsNumber())) {
    printf("AppRenderAndLoop arguments: function, bool\n");
    exit(1);
  }

  Napi::Function renderFunc = info[0].As<Napi::Function>();
  int num_render = info[1].ToNumber().Int32Value();

  // Get window renderer
  this->rendererHandle = SDL_CreateRenderer(this->windowHandle, -1,
    SDL_RENDERER_ACCELERATED | SDL_RENDERER_PRESENTVSYNC);

  if (!this->rendererHandle) {
    printf("SDL_CreateRenderer() failed with \"%s.\"", SDL_GetError());
    return Napi::Number::New(env, -1);
  }

  int viewWidth = this->renderPlane->width;
  int viewHeight = this->renderPlane->height;

  this->textureHandle = SDL_CreateTexture(
      this->rendererHandle,
      SDL_PIXELFORMAT_RGBA8888,
      SDL_TEXTUREACCESS_STREAMING,
      viewWidth,
      viewHeight);

  // A basic main loop to handle events
  this->isRunning = true;
  SDL_Event event;
  while (this->isRunning) {
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

    if (num_render == 0) {
      SDL_Delay(16);
      continue;
    }

    StartFrame();

    // If an error happened, break the loop
    renderFunc.Call(0, NULL);
    if (env.IsExceptionPending()) {
      break;
    }
    this->renderPlane->Finish();

    if (this->renderPlane->buffer) {
      int pitch = this->renderPlane->rowSize*4;
      SDL_UpdateTexture(this->textureHandle, NULL, this->renderPlane->buffer,
                        pitch);
    }

    SDL_RenderCopy(this->rendererHandle, this->textureHandle, NULL, NULL);
    // Swap buffers to display
    SDL_RenderPresent(this->rendererHandle);

    if (num_render > 0) {
      num_render--;
    }

    EndFrame();
  }

  return Napi::Number::New(env, 0);
}

Napi::Value SDLDisplay::AppQuit(const Napi::CallbackInfo& info) {
  this->isRunning = false;
  return info.Env().Null();
}

#define TAU 6.283

#define OPAQUE 255

void SDLDisplay::StartFrame() {
  SDL_RenderClear(this->rendererHandle);
  this->renderPlane->BeginFrame();
}

void SDLDisplay::EndFrame() {
}

Napi::Value SDLDisplay::ReadImage(const Napi::CallbackInfo& info) {
  Napi::Value val = info[0];
  Napi::String str = val.ToString();
  std::string s = str.Utf8Value();
  Napi::Env env = info.Env();

  // TODO: Other formats
  Image* img = NULL;
  int err = LoadPng(s.c_str(), &img);
  if (err != 0) {
    // TODO: Throw an error
    return Napi::Number::New(env, -1);
  }
  int id = this->imgList.size();
  this->imgList.push_back(img);

  return Napi::Number::New(env, id);
}

int SDLDisplay::numImages() {
  return this->imgList.size();
}

Image* SDLDisplay::getImage(int num) {
  return this->imgList[num];
}
