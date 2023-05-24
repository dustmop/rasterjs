#ifdef RASPBERRYPI

#include "assert.h"
#include "rpi_backend.h"
#include "type.h"
#include "bcm_host.h"

int g_displayWidth = 0;
int g_displayHeight = 0;
napi_ref g_rendererRef;
Napi::FunctionReference g_renderFunc;
Napi::FunctionReference g_execNextFrame;
bool g_isRunning;

typedef struct Plane_t {
    int width;
    int height;
    int pitch;
    unsigned char* data;
} Plane;

#define ALIGN16(n) ((n+15)&(~15))
#define RGB_PIXEL_SIZE 4
void plane_init(Plane* plane, int width, int height) {
    int pitch = ALIGN16(width) * 4;
    unsigned char* data = (unsigned char*)malloc(height * pitch);
    plane->width = width;
    plane->height = height;
    plane->pitch = pitch;
    plane->data = data;
}

// ---------------------------------------------------------------------- //

VC_DISPMANX_ALPHA_T g_alpha = {
  DISPMANX_FLAGS_ALPHA_FIXED_ALL_PIXELS,
  255, /*alpha 0->255*/
  0
};

typedef struct DispSys_t {
	DISPMANX_DISPLAY_HANDLE_T display;
	DISPMANX_MODEINFO_T info;
	DISPMANX_UPDATE_HANDLE_T update;
} DispSys;

void init_display_system(DispSys* dispsys, int displayNumber) {
	DISPMANX_DISPLAY_HANDLE_T display
		= vc_dispmanx_display_open(displayNumber);
	assert(display != 0);

	int result = vc_dispmanx_display_get_info(display, &dispsys->info);
	assert(result == 0);

	dispsys->display = display;
}

void display_update_start(DispSys* dispsys) {
	DISPMANX_UPDATE_HANDLE_T update = vc_dispmanx_update_start(0);
	assert(update != 0);
	dispsys->update = update;
}

void display_update_sync(DispSys* dispsys) {
	int result;
	result = vc_dispmanx_update_submit_sync(dispsys->update);
	assert(result == 0);
}

//-------------------------------------------------------------------------

typedef struct Image_t {
	uint32_t handle;
	uint32_t back_handle;
	DISPMANX_RESOURCE_HANDLE_T resource;
	DISPMANX_RESOURCE_HANDLE_T back_resource;
	DISPMANX_ELEMENT_HANDLE_T element;
	int width;
	int height;
    int pitch;
    unsigned char* data;
} Image;

void image_add(DispSys* dispsys, Image *img) {
	VC_RECT_T src_rect;
	VC_RECT_T dst_rect;
	int scale = 1 << 16;

	vc_dispmanx_rect_set(&src_rect, 0, 0,
						 img->width * scale,
						 img->height * scale);

	vc_dispmanx_rect_set(&dst_rect,
						 (dispsys->info.width - dispsys->info.height) / 2,
						 0,
						 dispsys->info.height,
						 dispsys->info.height);

	DISPMANX_ELEMENT_HANDLE_T element =
		vc_dispmanx_element_add(dispsys->update,
	                            dispsys->display,
	                            2, // layer
	                            &dst_rect,
	                            img->resource,
	                            &src_rect,
	                            DISPMANX_PROTECTION_NONE,
	                            &g_alpha,
	                            NULL, // clamp
	                            DISPMANX_NO_ROTATE);
	assert(element != 0);
	img->element = element;
}

VC_DISPMANX_ALPHA_T alpha_source = { DISPMANX_FLAGS_ALPHA_FROM_SOURCE, 255, 0};

//-------------------------------------------------------------------------

void image_background_load(Image* img) {
	uint32_t vc_image_ptr;

	VC_IMAGE_TYPE_T type = VC_IMAGE_RGBA32;

	VC_RECT_T rect;
	vc_dispmanx_rect_set(&rect, 0, 0, 1, 1);

	DISPMANX_RESOURCE_HANDLE_T bgResource =
	    vc_dispmanx_resource_create(type, 1, 1, &vc_image_ptr);
	assert(bgResource != 0);
	uint32_t background = 0;
	int result;
	result = vc_dispmanx_resource_write_data(bgResource,
	                                         type,
	                                         sizeof(background),
	                                         &background,
	                                         &rect);
	assert(result == 0);

	img->handle = vc_image_ptr;
	img->resource = bgResource;
	img->width = 1;
	img->height = 1;
	img->element = 0;
}

void bg_add(DispSys* dispsys, Image* img) {
	VC_RECT_T src_rect;
	VC_RECT_T dst_rect;

	vc_dispmanx_rect_set(&src_rect, 0, 0, 1, 1);
	vc_dispmanx_rect_set(&dst_rect, 0, 0, 0, 0);

	DISPMANX_ELEMENT_HANDLE_T bgElement =
	    vc_dispmanx_element_add(dispsys->update,
	                            dispsys->display,
	                            1, // layer
	                            &dst_rect,
	                            img->resource,
	                            &src_rect,
	                            DISPMANX_PROTECTION_NONE,
	                            &g_alpha,
	                            NULL, // clamp
	                            DISPMANX_NO_ROTATE);
	assert(bgElement != 0);
	img->element = bgElement;
}

//-------------------------------------------------------------------------

void use_buffer(Image* img, Plane* plane) {
	uint32_t handle;

	VC_IMAGE_TYPE_T type = VC_IMAGE_RGBA32;

    int width = plane->width;
    int height = plane->height;
    int pitch = plane->pitch;
    unsigned char* data = plane->data;

	DISPMANX_RESOURCE_HANDLE_T resource;
	resource = vc_dispmanx_resource_create(type, width, height, &handle);
	assert(resource != 0);

    uint32_t back_handle;
	DISPMANX_RESOURCE_HANDLE_T back_resource;
	back_resource = vc_dispmanx_resource_create(type, width, height, &back_handle);
	assert(back_resource != 0);

	VC_RECT_T rect;
	vc_dispmanx_rect_set(&rect, 0, 0, width, height);

	int result;
	result = vc_dispmanx_resource_write_data(resource,
	                                         type,
                                             pitch,
	                                         data,
	                                         &rect);
	assert(result == 0);

	img->handle = handle;
	img->resource = resource;
	img->width = width;
	img->height = height;
	img->pitch = pitch;
	img->element = 0;
    img->data = data;
    img->back_handle = back_handle;
    img->back_resource = back_resource;
}

//-------------------------------------------------------------------------

void modify_image(Image *img) {
	VC_RECT_T rect;
	vc_dispmanx_rect_set(&rect, 0, 0, img->width, img->height);

    int pitch = img->pitch;
    int result;
	VC_IMAGE_TYPE_T type = VC_IMAGE_RGBA32;
    result = vc_dispmanx_resource_write_data(img->back_resource,
                                             type,
                                             pitch,
                                             img->data,
                                             &rect);
    assert(result == 0);
}

void image_swap(DispSys* dispsys, Image *img) {
    DISPMANX_RESOURCE_HANDLE_T tmp_res = img->back_resource;
    img->back_resource = img->resource;
    img->resource = tmp_res;

    int result;
    result = vc_dispmanx_element_change_source(dispsys->update,
                                               img->element,
                                               img->resource);
    assert(result == 0);
}

//-------------------------------------------------------------------------

DispSys dispsys;
Image backgroundLayer;
Image mainLayer;


void display_initialize() {
	// Raspberry Pi graphics mode.
	bcm_host_init();

    // Turn off anti-aliasing.
    system("vcgencmd scaling_kernel 0 0 0 0 0 0 0 0 1 1 1 1 255 255 255 255 255 255 255 255 1 1 1 1 0 0 0 0 0 0 0 0 1");

	//---------------------------------------------------------------------
	// Initialize display

	init_display_system(&dispsys, 0);

	//---------------------------------------------------------------------
	// Create the black background, 1x1 pixels

	image_background_load(&backgroundLayer);
}


void display_use_plane(Plane* plane) {
    use_buffer(&mainLayer, plane);
	display_update_start(&dispsys);
	{
		bg_add(&dispsys, &backgroundLayer);
		image_add(&dispsys, &mainLayer);
	}
	display_update_sync(&dispsys);
}


void display_show() {
    modify_image(&mainLayer);
	display_update_start(&dispsys);
	{
		image_swap(&dispsys, &mainLayer);
	}
	display_update_sync(&dispsys);
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
};

Napi::Object RPIBackend::NewInstance(Napi::Env env, Napi::Value arg) {
  Napi::EscapableHandleScope scope(env);
  Napi::Object obj = g_rpiDisplayConstructor.New({arg});
  return scope.Escape(napi_value(obj)).ToObject();
}

Napi::Value RPIBackend::Initialize(const Napi::CallbackInfo& info) {
  display_initialize();
  return info.Env().Null();
}

Napi::Value RPIBackend::Name(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  return Napi::String::New(env, "rpi");
}

Napi::Value RPIBackend::BeginRender(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  g_displayWidth = info[0].ToNumber().Int32Value();
  g_displayHeight = info[1].ToNumber().Int32Value();

  Napi::Object rendererObj = info[2].As<Napi::Object>();
  napi_create_reference(env, rendererObj, 1, &g_rendererRef);

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

  Plane mainPlane;
  plane_init(&mainPlane, g_displayWidth, g_displayHeight);
  display_use_plane(&mainPlane);

  unsigned char* dataSource = NULL;

  Napi::Value runIDVal = info[0];
  Napi::FunctionReference execNextFrame = Napi::Persistent(info[1].As<Napi::Function>());

  for (;;) {

    // create an empty object for js function calls
    napi_value self;
    napi_status status;
    status = napi_create_object(env, &self);
    if (status != napi_ok) {
      printf("napi_create_object(self) failed to create\n");
      return env.Null();
    }

    // call the executor
    napi_value needRenderVal;
    needRenderVal = execNextFrame.Call(self, 0, NULL);
    if (env.IsExceptionPending()) {
      printf("exception!!\n");
      return env.Null();
    }

    // Call the render function.
    napi_value resVal;
    napi_get_reference_value(env, g_rendererRef, &resVal);
    Napi::Object rendererObj = Napi::Object(env, resVal);
    Napi::Value renderFuncVal = rendererObj.Get("render");
    if (!renderFuncVal.IsFunction()) {
      printf("renderer.render() not found\n");
      exit(1);
    }
    Napi::Function renderFunc = renderFuncVal.As<Napi::Function>();
    resVal = renderFunc.Call(rendererObj, 0, NULL);
    if (env.IsExceptionPending()) {
      return env.Null();
    }

    // Get the pitch of the first layer, assume it is constant.
    // TODO: Fix this assumption
    Napi::Object resObj = Napi::Object(env, resVal);
    Napi::Value surfaceVal = resObj.As<Napi::Array>()[uint32_t(0)];
    Napi::Object surfaceObj = surfaceVal.As<Napi::Object>();
    Napi::Value realPitchNum = surfaceObj.Get("pitch");

    int viewHeight = g_displayHeight;
    int viewWidth = g_displayWidth;
    int viewPitch = viewWidth * RGB_PIXEL_SIZE;
    if (realPitchNum.IsNumber()) {
      viewPitch = realPitchNum.As<Napi::Number>().Int32Value();
    }

    // point to the raw buffer
    if (dataSource == NULL) {
      dataSource = surfaceToRawBuffer(surfaceVal);
    }

    // copy from buffer to mainPlane.data
    for (int y = 0; y < mainPlane.height; y++) {
      for (int x = 0; x < mainPlane.width; x++) {
        int k = mainPlane.pitch * y + x * 4;
        int j = y * viewPitch + x * 4;
        mainPlane.data[k+0] = dataSource[j+0];
        mainPlane.data[k+1] = dataSource[j+1];
        mainPlane.data[k+2] = dataSource[j+2];
        mainPlane.data[k+3] = dataSource[j+3];
      }
    }

    display_show();

    // sleep

    usleep(16 * 1000);
  }

  return env.Null();
}

Napi::Value RPIBackend::InsteadWriteBuffer(const Napi::CallbackInfo& info) {
  return info.Env().Null();
}

#endif
