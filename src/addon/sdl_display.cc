#include "sdl_display.h"
#include "plane.h"

#include "gfx_types.h"
#include "time_keeper.h"
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
  this->sdl_initialized = 0;
  this->windowWidth = 0;
  this->windowHeight = 0;
  this->renderPlane = NULL;
};

// TODO: Global display object
SDL_Window* g_window = NULL;
SDL_Renderer* g_renderer = NULL;
SDL_Texture* g_texture = NULL;


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
    sdl_initialized = 1;
  }
  return Napi::Number::New(env, 0);
}

Napi::Value SDLDisplay::CreateWindow(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (!sdl_initialized) {
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
  g_window = SDL_CreateWindow(
      "RasterJS",
      SDL_WINDOWPOS_UNDEFINED,
      SDL_WINDOWPOS_UNDEFINED,
      windowWidth, windowHeight,
      SDL_WINDOW_SHOWN | SDL_WINDOW_ALLOW_HIGHDPI);
  if (g_window == NULL) {
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

  if (!this->sdl_initialized || !g_window) {
    return Napi::Number::New(env, -1);
  }

  if ((info.Length() < 2) || (!info[0].IsFunction()) || (!info[1].IsNumber())) {
    printf("AppRenderAndLoop arguments: function, bool\n");
    exit(1);
  }

  Napi::Function renderFunc = info[0].As<Napi::Function>();
  int num_render = info[1].ToNumber().Int32Value();

  // Get window renderer
  g_renderer = SDL_CreateRenderer(g_window, -1, SDL_RENDERER_ACCELERATED);
  if (!g_renderer) {
    printf("SDL_CreateRenderer() failed with \"%s.\"", SDL_GetError());
    return Napi::Number::New(env, -1);
  }

  int viewWidth = this->renderPlane->width;
  int viewHeight = this->renderPlane->height;

  g_texture = SDL_CreateTexture(g_renderer, SDL_PIXELFORMAT_RGBA8888,
                                SDL_TEXTUREACCESS_STREAMING,
                                viewWidth, viewHeight);

  TimeKeeper keeper;
  keeper.Init();

  // A basic main loop to handle events
  this->is_running = true;
  SDL_Event event;
  while (this->is_running) {
    if (SDL_PollEvent(&event)) {
      switch (event.type) {
      case SDL_QUIT:
        this->is_running = false;
        break;
      case SDL_KEYDOWN:
        if (event.key.keysym.sym == SDLK_ESCAPE) {
          this->is_running = false;
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
        this->is_running = false;
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
      SDL_UpdateTexture(g_texture, NULL, this->renderPlane->buffer, pitch);
    }

    SDL_RenderCopy(g_renderer, g_texture, NULL, NULL);
    // Swap buffers to display
    SDL_RenderPresent(g_renderer);

    keeper.WaitNextFrame();

    if (num_render > 0) {
      num_render--;
    }

    EndFrame();
  }

  return Napi::Number::New(env, 0);
}

Napi::Value SDLDisplay::AppQuit(const Napi::CallbackInfo& info) {
  this->is_running = false;
  return info.Env().Null();
}

#define TAU 6.283

#define OPAQUE 255

void SDLDisplay::StartFrame() {
  SDL_RenderClear(g_renderer);
  this->renderPlane->BeginFrame();
}

void SDLDisplay::EndFrame() {
}

Image** g_img_list = NULL;
int num_img = 0;

Napi::Value SDLDisplay::ReadImage(const Napi::CallbackInfo& info) {
  Napi::Value val = info[0];
  Napi::String str = val.ToString();
  std::string s = str.Utf8Value();
  // TODO: Other formats
  Image* img = LoadPng(s.c_str());
  if (g_img_list == NULL) {
    int capacity = sizeof(Image*) * 100;
    g_img_list = (Image**)malloc(capacity);
    memset(g_img_list, 0, capacity);
  }
  int id = num_img;
  g_img_list[num_img] = img;
  num_img++;

  Napi::Env env = info.Env();
  return Napi::Number::New(env, id);
}
