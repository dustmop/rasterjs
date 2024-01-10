#ifdef ENABLE_ADAFRUIT_HAT

#include "assert.h"
#include "adafruithat_backend.h"
#include "type.h"
#include "wait_frame_unix.h"

#define ALIGN64(n) ((n+63)&(~63))
#define RGB_PIXEL_SIZE 4

#include "led-matrix.h"
#include "pixel-mapper.h"
#include "graphics.h"
#include "common.h"

using namespace rgb_matrix;
RGBMatrix *matrix = NULL;


// ---------------------------------------------------------------------- //

Napi::FunctionReference g_adafruitHatDisplayConstructor;

void AdafruitHatBackend::InitClass(Napi::Env env, Napi::Object exports) {
  Napi::Function func = DefineClass(
      env,
      "Display",
      {InstanceMethod("initialize", &AdafruitHatBackend::Initialize),
       InstanceMethod("name", &AdafruitHatBackend::Name),
       InstanceMethod("beginRender", &AdafruitHatBackend::BeginRender),
       InstanceMethod("config", &AdafruitHatBackend::Config),
       InstanceMethod("eventReceiver", &AdafruitHatBackend::EventReceiver),
       InstanceMethod("runAppLoop", &AdafruitHatBackend::RunAppLoop),
       InstanceMethod("insteadWriteBuffer", &AdafruitHatBackend::InsteadWriteBuffer),
       InstanceMethod("getFeatureList", &AdafruitHatBackend::GetFeatureList),
  });
  g_adafruitHatDisplayConstructor = Napi::Persistent(func);
  g_adafruitHatDisplayConstructor.SuppressDestruct();
}

AdafruitHatBackend::AdafruitHatBackend(const Napi::CallbackInfo& info)
    : Napi::ObjectWrap<AdafruitHatBackend>(info) {
  this->dataSource = NULL;
};

Napi::Object AdafruitHatBackend::NewInstance(Napi::Env env, Napi::Value arg) {
  Napi::EscapableHandleScope scope(env);
  Napi::Object obj = g_adafruitHatDisplayConstructor.New({arg});
  return scope.Escape(napi_value(obj)).ToObject();
}

Napi::Value AdafruitHatBackend::Initialize(const Napi::CallbackInfo& info) {
  return info.Env().Null();
}

Napi::Value AdafruitHatBackend::Name(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  return Napi::String::New(env, "adafruithat");
}

Napi::Value AdafruitHatBackend::BeginRender(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  this->viewWidth = info[0].ToNumber().Int32Value();
  this->viewHeight = info[1].ToNumber().Int32Value();

  Napi::Object rendererObj = info[2].As<Napi::Object>();
  napi_create_reference(env, rendererObj, 1, &this->rendererRef);

  return env.Null();
}

Napi::Value AdafruitHatBackend::Config(const Napi::CallbackInfo& info) {
  return info.Env().Null();
}

Napi::Value AdafruitHatBackend::EventReceiver(const Napi::CallbackInfo& info) {
  return info.Env().Null();
}

Napi::Value AdafruitHatBackend::RunAppLoop(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  Napi::Value runIDVal = info[0];
  this->execNextFrame = Napi::Persistent(info[1].As<Napi::Function>());
  this->execOneFrame(info);
  return env.Null();
}


void AdafruitHatBackend::execOneFrame(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  // TODO: poll for events
  // TODO: isRunning

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
    printf("exception!!\n");
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
  this->renderFunc = Napi::Persistent(renderFuncVal.As<Napi::Function>());
  resVal = this->renderFunc.Call(rendererObj, 0, NULL);
  if (env.IsExceptionPending()) {
    return;
  }

  // Get the pitch of the first layer, assume it is constant.
  // TODO: Fix this assumption
  Napi::Object resObj = Napi::Object(env, resVal);
  Napi::Value surfaceVal = resObj.As<Napi::Array>()[uint32_t(0)];
  Napi::Object surfaceObj = surfaceVal.As<Napi::Object>();
  Napi::Value realPitchNum = surfaceObj.Get("pitch");

  this->datasourcePitch = this->viewWidth * RGB_PIXEL_SIZE;
  if (realPitchNum.IsNumber()) {
    this->datasourcePitch = realPitchNum.As<Napi::Number>().Int32Value();
  }

  // point to the raw buffer
  if (this->dataSource == NULL) {
    this->dataSource = surfaceToRawBuffer(surfaceVal);
  }


  this->displayFrameOnHardware();
  this->next(env);
}

static void BeginNextFrame(const Napi::CallbackInfo& info) {
  void* data = info.Data();
  AdafruitHatBackend* self = (AdafruitHatBackend*)data;
  self->execOneFrame(info);
}

void AdafruitHatBackend::next(Napi::Env env) {
  Napi::Function cont = Napi::Function::New(env, BeginNextFrame,
                                            "<unknown>", this);
  WaitFrame* w = new WaitFrame(cont, 16);
  w->Queue();
}

Napi::Value AdafruitHatBackend::InsteadWriteBuffer(const Napi::CallbackInfo& info) {
  return info.Env().Null();
}

Napi::Value AdafruitHatBackend::GetFeatureList(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  Napi::Array features = Napi::Array::New(env);
  features[uint32_t(0)] = "forceSoftwareCompositor";
  return env.Null();
}

void AdafruitHatBackend::displayFrameOnHardware() {
  int width = this->viewWidth;
  int height = this->viewHeight;

  RGBMatrix::Options matrix_options;
  rgb_matrix::RuntimeOptions runtime_opt;


  // TODO: method to assign these from js
  matrix_options.cols = 64;
  matrix_options.rows = 32;
  matrix_options.chain_length = 1;
  matrix_options.parallel = 1;
  matrix_options.hardware_mapping = "adafruit-hat";

  if (matrix == NULL) {
    matrix = RGBMatrix::CreateFromOptions(matrix_options, runtime_opt);
  }

  for (int y = 0; y < height; y++) {
    for (int x = 0; x < width; x++) {
      int k = y * this->datasourcePitch + x * 4;
      char rval = this->dataSource[k+0];
      char gval = this->dataSource[k+1];
      char bval = this->dataSource[k+2];
      matrix->SetPixel(x, y, rval, gval, bval);
    }
  }
}


#endif
