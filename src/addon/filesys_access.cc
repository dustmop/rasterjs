#include <string>
#include <fstream>
#include <streambuf>

#include "filesys_access.h"

#include "png_load_write.h"

Napi::FunctionReference g_filesysAccessConstructor;

void FilesysAccess::InitClass(Napi::Env env, Napi::Object exports) {
  Napi::Function func = DefineClass(
      env,
      "FilesysAccess",
      {InstanceMethod("clear", &FilesysAccess::Clear),
       InstanceMethod("openImage", &FilesysAccess::OpenImage),
       InstanceMethod("openText", &FilesysAccess::OpenText),
       InstanceMethod("saveTo", &FilesysAccess::SaveTo),
       InstanceMethod("whenLoaded", &FilesysAccess::WhenLoaded),
  });
  g_filesysAccessConstructor = Napi::Persistent(func);
  g_filesysAccessConstructor.SuppressDestruct();
}

FilesysAccess::FilesysAccess(const Napi::CallbackInfo& info) : Napi::ObjectWrap<FilesysAccess>(info) {
  Napi::Env env = info.Env();
  Napi::HandleScope scope(env);
}

Napi::Object FilesysAccess::NewInstance(Napi::Env env, Napi::Value arg) {
  Napi::EscapableHandleScope scope(env);
  Napi::Object obj = g_filesysAccessConstructor.New({arg});
  return scope.Escape(napi_value(obj)).ToObject();
}

Napi::Value FilesysAccess::Clear(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  return Napi::Number::New(env, 0);
}

Napi::Value FilesysAccess::OpenImage(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  Napi::Value fileVal = info[0];
  Napi::String fileStr = fileVal.ToString();
  std::string filename = fileStr.Utf8Value();

  Napi::Value imgVal = info[1];
  Napi::Object imgObj = imgVal.ToObject();

  // TODO: Other formats
  Surface surf;
  surf.buff = NULL;
  int err = LoadPng(filename.c_str(), &surf);
  if (err != 0) {
    // Return -1 which means "not found"
    return Napi::Number::New(env, -1);
  }

  imgObj.Set("width", surf.width);
  imgObj.Set("height", surf.height);
  imgObj.Set("pitch", surf.pitch);

  int byteLength = surf.width * surf.height * 4;
  Napi::ArrayBuffer arrayBuff = Napi::ArrayBuffer::New(env, byteLength);
  uint8* buffData = (uint8*)arrayBuff.Data();
  for (int k = 0; k < byteLength; k++) {
    buffData[k] = surf.buff[k];
  }
  imgObj.Set("rgbBuff", arrayBuff);

  // TODO: Return value should be uint8array, not ArrayBuffer
  //Napi::Value arr = Napi::TypedArrayOf<uint8_t>::New(env, 1, arrayBuff, 0, napi_uint8_array);
  //imgObj.Set("data", arr);

  return Napi::Number::New(env, 0);
}

Napi::Value FilesysAccess::OpenText(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  Napi::Value fileVal = info[0];
  Napi::String fileStr = fileVal.ToString();
  std::string filename = fileStr.Utf8Value();

  std::ifstream reader(filename.c_str());
  std::string content((std::istreambuf_iterator<char>(reader)),
                       std::istreambuf_iterator<char>());

  Napi::Object result = Napi::Object::New(env);
  result.Set("src", fileStr);

  Napi::String str = Napi::String::New(env, content);
  result.Set("content", str);

  return result;
}

Napi::Value FilesysAccess::SaveTo(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  Napi::Value val = info[0];
  Napi::String str = val.ToString();
  std::string savepath = str.Utf8Value();

  Napi::Array listObj = info[1].As<Napi::Array>();
  Napi::Value surfaceVal = listObj[uint32_t(0)];
  Napi::Object surfaceObj = surfaceVal.As<Napi::Object>();

  Napi::Value bufferVal = surfaceObj.Get("buff");
  if (!bufferVal.IsTypedArray()) {
    printf("bufferVal expected a TypedArray, did not get one!\n");
    exit(1);
  }
  Napi::TypedArray typeArr = bufferVal.As<Napi::TypedArray>();
  Napi::ArrayBuffer arrBuff = typeArr.ArrayBuffer();
  void* untypedData = arrBuff.Data();
  unsigned char* rawBuff = (unsigned char*)untypedData;

  Napi::Value widthVal = surfaceObj.Get("width");
  Napi::Value heightVal = surfaceObj.Get("height");
  Napi::Value pitchVal = surfaceObj.Get("pitch");

  Surface surf;
  surf.width = widthVal.As<Napi::Number>().Int32Value();
  surf.height = heightVal.As<Napi::Number>().Int32Value();
  surf.pitch = pitchVal.As<Napi::Number>().Int32Value();
  surf.buff = rawBuff;

  WritePng(savepath.c_str(), &surf);

  return Napi::Number::New(env, 0);
}

Napi::Value FilesysAccess::WhenLoaded(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  Napi::Value arg = info[0];

  if (!arg.IsFunction()) {
    printf("whenLoaded needs to be given a function\n");
    exit(1);
  }
  Napi::Function callbackFunc = arg.As<Napi::Function>();

  napi_status status;
  napi_value self;
  status = napi_create_object(env, &self);
  if (status != napi_ok) {
    printf("napi_create_object(self) failed to create\n");
    return Napi::Number::New(env, -1);
  }
  napi_value resVal;
  status = napi_call_function(env, self, callbackFunc, 0, NULL, &resVal);
  if (status != napi_ok) {
    // TODO: Copy the func from sdl_display here
    printf("function call failed!\n");
  }

  return Napi::Number::New(env, 0);
}
