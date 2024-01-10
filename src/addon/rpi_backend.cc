#ifdef RASPBERRYPI

#include "assert.h"
#include "rpi_backend.h"
#include "type.h"
#include "bcm_host.h"
#include "wait_frame_unix.h"


#define ALIGN64(n) ((n+63)&(~63))
#define RGB_PIXEL_SIZE 4
VC_IMAGE_TYPE_T RGB_TYPE = VC_IMAGE_RGBA32;


// ---------------------------------------------------------------------- //

VC_DISPMANX_ALPHA_T g_alpha = {
  DISPMANX_FLAGS_ALPHA_FIXED_ALL_PIXELS,
  255, /*alpha 0->255*/
  0
};

struct DispSys {
  DISPMANX_DISPLAY_HANDLE_T display;
  DISPMANX_MODEINFO_T info;
};

void init_display_system(DispSys* dispsys, int displayNumber) {
  DISPMANX_DISPLAY_HANDLE_T display = vc_dispmanx_display_open(displayNumber);
  assert(display != 0);

  int result = vc_dispmanx_display_get_info(display, &dispsys->info);
  assert(result == 0);

  dispsys->display = display;
}

//-------------------------------------------------------------------------

struct UpdateSync {
  DISPMANX_UPDATE_HANDLE_T update_handle;
};

void display_update_begin(UpdateSync* upsync) {
  upsync->update_handle = vc_dispmanx_update_start(0);
}

void display_update_commit(UpdateSync* upsync) {
  int res = vc_dispmanx_update_submit_sync(upsync->update_handle);
  assert(res == 0);
}

//-------------------------------------------------------------------------

struct PixelBuffer {
  uint32_t handle;
  DISPMANX_RESOURCE_HANDLE_T resource;
  DISPMANX_ELEMENT_HANDLE_T element;
  int width;
  int height;
  int pitch;
  unsigned char* data;
};

struct Offscreen {
  uint32_t handle;
  DISPMANX_RESOURCE_HANDLE_T resource;
};

struct RPIGraphicsData {
  DispSys dispsys;
  PixelBuffer letterboxPixbuff;
  PixelBuffer primaryPixbuff;
  Offscreen back;
};

//-------------------------------------------------------------------------

void image_add(DispSys* dispsys, UpdateSync* upsync, PixelBuffer *pixbuff) {
  VC_RECT_T src_rect;
  VC_RECT_T dst_rect;
  int scale = 1 << 16;

  vc_dispmanx_rect_set(&src_rect, 0, 0,
                       pixbuff->width * scale,
                       pixbuff->height * scale);

  // Calculate scale based upon whether width or height is closer to display
  float h_scale = (float)dispsys->info.height / pixbuff->height;
  float w_scale = (float)dispsys->info.width / pixbuff->width;
  float real_scale = (h_scale < w_scale) ? h_scale : w_scale;

  // Calculate how to offset the rect so that display is centered
  int target_w = pixbuff->width * real_scale;
  int target_h = pixbuff->height * real_scale;
  int offset_w = (dispsys->info.width - target_w) / 2;
  int offset_h = (dispsys->info.height - target_h) / 2;

  vc_dispmanx_rect_set(&dst_rect, offset_w, offset_h, target_w, target_h);

  DISPMANX_ELEMENT_HANDLE_T element =
    vc_dispmanx_element_add(upsync->update_handle,
                            dispsys->display,
                            2, // layer
                            &dst_rect,
                            pixbuff->resource,
                            &src_rect,
                            DISPMANX_PROTECTION_NONE,
                            &g_alpha,
                            NULL, // clamp
                            DISPMANX_NO_ROTATE);
  assert(element != 0);
  pixbuff->element = element;
}

VC_DISPMANX_ALPHA_T alpha_source = { DISPMANX_FLAGS_ALPHA_FROM_SOURCE, 255, 0};

//-------------------------------------------------------------------------

void image_background_load(PixelBuffer* pixbuff) {
  uint32_t vc_image_ptr;

  VC_RECT_T rect;
  vc_dispmanx_rect_set(&rect, 0, 0, 1, 1);

  DISPMANX_RESOURCE_HANDLE_T bgResource =
      vc_dispmanx_resource_create(RGB_TYPE, 1, 1, &vc_image_ptr);
  assert(bgResource != 0);
  uint32_t background = 0;
  int result;
  result = vc_dispmanx_resource_write_data(bgResource,
                                           RGB_TYPE,
                                           sizeof(background),
                                           &background,
                                           &rect);
  assert(result == 0);

  pixbuff->handle = vc_image_ptr;
  pixbuff->resource = bgResource;
  pixbuff->width = 1;
  pixbuff->height = 1;
  pixbuff->element = 0;
}

void bg_add(DispSys* dispsys, UpdateSync* upsync, PixelBuffer* pixbuff) {
  VC_RECT_T src_rect;
  VC_RECT_T dst_rect;

  vc_dispmanx_rect_set(&src_rect, 0, 0, 1, 1);
  vc_dispmanx_rect_set(&dst_rect, 0, 0, 0, 0);

  DISPMANX_ELEMENT_HANDLE_T bgElement =
      vc_dispmanx_element_add(upsync->update_handle,
                              dispsys->display,
                              1, // layer
                              &dst_rect,
                              pixbuff->resource,
                              &src_rect,
                              DISPMANX_PROTECTION_NONE,
                              &g_alpha,
                              NULL, // clamp
                              DISPMANX_NO_ROTATE);
  assert(bgElement != 0);
  pixbuff->element = bgElement;
}

//-------------------------------------------------------------------------

void use_buffer(PixelBuffer* pixbuff) {
  uint32_t handle;

  int width = pixbuff->width;
  int height = pixbuff->height;
  //int pitch = pixbuff->pitch;

  DISPMANX_RESOURCE_HANDLE_T resource;
  resource = vc_dispmanx_resource_create(RGB_TYPE, width, height, &handle);
  assert(resource != 0);

  VC_RECT_T rect;
  vc_dispmanx_rect_set(&rect, 0, 0, width, height);

  pixbuff->handle = handle;
  pixbuff->resource = resource;
  pixbuff->element = 0;
}

void alloc_backbuffer(Offscreen* back, PixelBuffer* pixbuff) {
  uint32_t handle;
  DISPMANX_RESOURCE_HANDLE_T resource;
  resource = vc_dispmanx_resource_create(RGB_TYPE,
                                         pixbuff->width,
                                         pixbuff->height,
                                         &handle);
  assert(resource != 0);

  back->resource = resource;
  back->handle = handle;
}

//-------------------------------------------------------------------------

void gfx_upload_buffer(PixelBuffer* pixbuff, Offscreen* back, int use_front) {
  VC_RECT_T rect;
  vc_dispmanx_rect_set(&rect, 0, 0, pixbuff->width, pixbuff->height);

  DISPMANX_RESOURCE_HANDLE_T resource = back->resource;
  if (use_front) {
    resource = pixbuff->resource;
  }

  int result;
  result = vc_dispmanx_resource_write_data(resource,
                                           RGB_TYPE,
                                           pixbuff->pitch,
                                           pixbuff->data,
                                           &rect);
  assert(result == 0);
}

void gfx_swap_buffers(UpdateSync* upsync, PixelBuffer *pixbuff, Offscreen* back) {
  DISPMANX_RESOURCE_HANDLE_T tmp_res = back->resource;
  back->resource = pixbuff->resource;
  pixbuff->resource = tmp_res;

  int result;
  result = vc_dispmanx_element_change_source(upsync->update_handle,
                                             pixbuff->element,
                                             pixbuff->resource);
  assert(result == 0);
}

//-------------------------------------------------------------------------


void display_initialize(RPIGraphicsData* gfx) {
  // Raspberry Pi graphics mode.
  bcm_host_init();

  // Turn off anti-aliasing.
  system("vcgencmd scaling_kernel 0 0 0 0 0 0 0 0 1 1 1 1 255 255 255 255 255 255 255 255 1 1 1 1 0 0 0 0 0 0 0 0 1");

  //---------------------------------------------------------------------
  // Initialize display

  init_display_system(&gfx->dispsys, 0);

  //---------------------------------------------------------------------
  // Create the black background, 1x1 pixels

  image_background_load(&gfx->letterboxPixbuff);
}


static int first_frame = true;

void display_frame_swap(RPIGraphicsData* gfx, UpdateSync* upsync) {
  // upload pixel data to the graphics
  gfx_upload_buffer(&gfx->primaryPixbuff, &gfx->back, first_frame);

  // begin a frame update
  display_update_begin(upsync);

  if (first_frame) {
    // first time a frame is being rendered
    bg_add(&gfx->dispsys, upsync, &gfx->letterboxPixbuff);
    image_add(&gfx->dispsys, upsync, &gfx->primaryPixbuff);
    first_frame = 0;
  } else {
    // later frames
    gfx_swap_buffers(upsync, &gfx->primaryPixbuff, &gfx->back);
  }

  // commit the frame, sync to display
  display_update_commit(upsync);
}


// ---------------------------------------------------------------------- //

Napi::FunctionReference g_rpiDisplayConstructor;

void RPIBackend::InitClass(Napi::Env env, Napi::Object exports) {
  Napi::Function func = DefineClass(
      env,
      "Display",
      {InstanceMethod("initialize", &RPIBackend::Initialize),
       InstanceMethod("name", &RPIBackend::Name),
       InstanceMethod("beginRender", &RPIBackend::BeginRender),
       InstanceMethod("config", &RPIBackend::Config),
       InstanceMethod("eventReceiver", &RPIBackend::EventReceiver),
       InstanceMethod("runAppLoop", &RPIBackend::RunAppLoop),
       InstanceMethod("insteadWriteBuffer", &RPIBackend::InsteadWriteBuffer),
  });
  g_rpiDisplayConstructor = Napi::Persistent(func);
  g_rpiDisplayConstructor.SuppressDestruct();
}

RPIBackend::RPIBackend(const Napi::CallbackInfo& info)
    : Napi::ObjectWrap<RPIBackend>(info) {
  this->gfx = new RPIGraphicsData;
  this->dataSource = NULL;
};

Napi::Object RPIBackend::NewInstance(Napi::Env env, Napi::Value arg) {
  Napi::EscapableHandleScope scope(env);
  Napi::Object obj = g_rpiDisplayConstructor.New({arg});
  return scope.Escape(napi_value(obj)).ToObject();
}

Napi::Value RPIBackend::Initialize(const Napi::CallbackInfo& info) {
  display_initialize(this->gfx);
  return info.Env().Null();
}

Napi::Value RPIBackend::Name(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  return Napi::String::New(env, "rpi");
}

Napi::Value RPIBackend::BeginRender(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  this->viewWidth = info[0].ToNumber().Int32Value();
  this->viewHeight = info[1].ToNumber().Int32Value();

  Napi::Object rendererObj = info[2].As<Napi::Object>();
  napi_create_reference(env, rendererObj, 1, &this->rendererRef);

  return env.Null();
}

Napi::Value RPIBackend::Config(const Napi::CallbackInfo& info) {
  return info.Env().Null();
}

Napi::Value RPIBackend::EventReceiver(const Napi::CallbackInfo& info) {
  return info.Env().Null();
}

Napi::Value RPIBackend::RunAppLoop(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  gfx->primaryPixbuff.width = this->viewWidth;
  gfx->primaryPixbuff.height = this->viewHeight;
  gfx->primaryPixbuff.pitch = ALIGN64(this->viewWidth * RGB_PIXEL_SIZE);
  gfx->primaryPixbuff.data = NULL;

  use_buffer(&gfx->primaryPixbuff);
  alloc_backbuffer(&gfx->back, &gfx->primaryPixbuff);

  Napi::Value runIDVal = info[0];
  this->execNextFrame = Napi::Persistent(info[1].As<Napi::Function>());
  this->execOneFrame(info);
  return env.Null();
}


void RPIBackend::execOneFrame(const Napi::CallbackInfo& info) {
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
    if (gfx->primaryPixbuff.data == NULL &&
        this->datasourcePitch == gfx->primaryPixbuff.pitch) {
      // Performance improvement!
      gfx->primaryPixbuff.data = this->dataSource;
    }
  }
  if (gfx->primaryPixbuff.data == NULL) {
    int buffsize = gfx->primaryPixbuff.height * gfx->primaryPixbuff.pitch;
    gfx->primaryPixbuff.data = (unsigned char*)malloc(buffsize);
  }

  if (gfx->primaryPixbuff.data != this->dataSource) {
    // copy from buffer to mainPlane.data
    for (int y = 0; y < gfx->primaryPixbuff.height; y++) {
      for (int x = 0; x < gfx->primaryPixbuff.width; x++) {
        int k = y * gfx->primaryPixbuff.pitch + x * RGB_PIXEL_SIZE;
        int j = y * this->datasourcePitch + x * RGB_PIXEL_SIZE;
        gfx->primaryPixbuff.data[k+0] = this->dataSource[j+0];
        gfx->primaryPixbuff.data[k+1] = this->dataSource[j+1];
        gfx->primaryPixbuff.data[k+2] = this->dataSource[j+2];
        gfx->primaryPixbuff.data[k+3] = this->dataSource[j+3];
      }
    }
  }

  UpdateSync upsync;
  display_frame_swap(this->gfx, &upsync);
  this->next(env);
}

static void BeginNextFrame(const Napi::CallbackInfo& info) {
  void* data = info.Data();
  RPIBackend* self = (RPIBackend*)data;
  self->execOneFrame(info);
}

void RPIBackend::next(Napi::Env env) {
  Napi::Function cont = Napi::Function::New(env, BeginNextFrame,
                                            "<unknown>", this);
  WaitFrame* w = new WaitFrame(cont, 16);
  w->Queue();
}

Napi::Value RPIBackend::InsteadWriteBuffer(const Napi::CallbackInfo& info) {
  return info.Env().Null();
}

Napi::Value RPIBackend::GetFeatureList(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  Napi::Array features;
  return env.Null();
}

#endif
