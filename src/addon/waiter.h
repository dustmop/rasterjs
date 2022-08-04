#include <chrono>
#include <thread>

using namespace Napi;

class WaitWorker : public AsyncWorker {
  public:
    WaitWorker(Function& callback, int millisec)
        : AsyncWorker(callback), waitFor(millisec) {}

    ~WaitWorker() {}

    void Execute() override {
        std::this_thread::sleep_for(std::chrono::milliseconds(this->waitFor));
    }

    void OnOK() override {
        HandleScope scope(Env());
        Callback().Call({Env().Null()});
    }

  private:
    int waitFor;
};
