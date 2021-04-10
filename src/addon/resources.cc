#include "resources.h"

#include "load_image.h"

Napi::FunctionReference g_resourcesConstructor;

void Resources::InitClass(Napi::Env env, Napi::Object exports) {
  Napi::Function func = DefineClass(
      env,
      "Resources",
      {InstanceMethod("clear", &Resources::Clear),
       InstanceMethod("readImage", &Resources::ReadImage),
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

Napi::Value Resources::ReadImage(const Napi::CallbackInfo& info) {
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
  imgList.push_back(img);
  return Napi::Number::New(env, id);
}

Image* Resources::getImage(int id) {
  if (id >= this->imgList.size()) {
    return NULL;
  }
  return this->imgList[id];
}

