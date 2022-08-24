#include <chrono>
#include <thread>

#include <SDL.h>

using namespace Napi;

class PresentFrame : public AsyncWorker {
  public:
    PresentFrame(Function& callback, SDL_Renderer* h)
        : AsyncWorker(callback), rendererHandle(h) {}

    ~PresentFrame() {}

    void Execute() override {
        SDL_RenderPresent(this->rendererHandle);
    }

    void OnOK() override {
        HandleScope scope(Env());
        Callback().Call({Env().Null()});
    }

  private:
    SDL_Renderer* rendererHandle;

};
