#include <time.h>

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
        timespec ts;
        ts.tv_sec = 0;
        ts.tv_nsec = 16 * 1000 * 1000;
        nanosleep(&ts, &ts);
    }

    void OnOK() override {
        HandleScope scope(Env());
        Callback().Call({Env().Null()});
    }

  private:
    int _millisec;
};
