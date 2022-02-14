#include <string>
#include <fstream>
#include <streambuf>

#include "resources.h"

#include "image_load_save.h"

Napi::FunctionReference g_resourcesConstructor;

void Resources::InitClass(Napi::Env env, Napi::Object exports) {
  Napi::Function func = DefineClass(
      env,
      "Resources",
      {InstanceMethod("clear", &Resources::Clear),
       InstanceMethod("openImage", &Resources::OpenImage),
       InstanceMethod("openText", &Resources::OpenText),
       InstanceMethod("saveTo", &Resources::SaveTo),
       InstanceMethod("allLoaded", &Resources::AllLoaded),
  });
  g_resourcesConstructor = Napi::Persistent(func);
  g_resourcesConstructor.SuppressDestruct();
}

Resources::Resources(const Napi::CallbackInfo& info) : Napi::ObjectWrap<Resources>(info) {
  Napi::Env env = info.Env();
  Napi::HandleScope scope(env);
}

Napi::Object Resources::NewInstance(Napi::Env env, Napi::Value arg) {
  Napi::EscapableHandleScope scope(env);
  Napi::Object obj = g_resourcesConstructor.New({arg});
  return scope.Escape(napi_value(obj)).ToObject();
}

Napi::Value Resources::Clear(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  return Napi::Number::New(env, 0);
}

Napi::Value Resources::OpenImage(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  Napi::Value fileVal = info[0];
  Napi::String fileStr = fileVal.ToString();
  std::string filename = fileStr.Utf8Value();

  Napi::Value imgVal = info[1];
  Napi::Object imgObj = imgVal.ToObject();

  // TODO: Other formats
  Image img;
  img.buff = NULL;
  int err = LoadPng(filename.c_str(), &img);
  if (err != 0) {
    // TODO: Throw an error
    return Napi::Number::New(env, -1);
  }

  imgObj.Set("width", img.width);
  imgObj.Set("height", img.height);
  imgObj.Set("pitch", img.pitch);

  int byteLength = img.width * img.height * 4;
  Napi::ArrayBuffer arrayBuff = Napi::ArrayBuffer::New(env, byteLength);
  uint8* buffData = (uint8*)arrayBuff.Data();
  for (int k = 0; k < byteLength; k++) {
    buffData[k] = img.buff[k];
  }
  imgObj.Set("rgbBuff", arrayBuff);

  // TODO: Return value should be uint8array, not ArrayBuffer
  //Napi::Value arr = Napi::TypedArrayOf<uint8_t>::New(env, 1, arrayBuff, 0, napi_uint8_array);
  //imgObj.Set("data", arr);

  return Napi::Number::New(env, 0);
}

Napi::Value Resources::OpenText(const Napi::CallbackInfo& info) {
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

Napi::Value Resources::SaveTo(const Napi::CallbackInfo& info) {
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

  int width = widthVal.As<Napi::Number>().Int32Value();
  int height = heightVal.As<Napi::Number>().Int32Value();
  int pitch = pitchVal.As<Napi::Number>().Int32Value();

  WritePng(savepath.c_str(), rawBuff, width, height, pitch);

  return Napi::Number::New(env, 0);
}

Napi::Value Resources::AllLoaded(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  return Napi::Number::New(env, 1);
}
