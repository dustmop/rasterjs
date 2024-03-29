#include <SDL.h>

using namespace Napi;

class WaitFrame : public AsyncWorker {
  public:
    WaitFrame(Function& callback, int millisec)
        : AsyncWorker(callback), _millisec(millisec) {
      if (!this->_millisec) {
        this->_millisec = 16;
      }
    }

    ~WaitFrame() {}

    void Execute() override {
        SDL_Delay(this->_millisec);
    }

    void OnOK() override {
        HandleScope scope(Env());
        Callback().Call({Env().Null()});
    }

  private:
    int _millisec;
};
