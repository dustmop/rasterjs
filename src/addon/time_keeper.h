class TimeKeeper {
 public:
  TimeKeeper();
  ~TimeKeeper();
  void Init();
  void WaitNextFrame();
 private:
  void* data;
};
