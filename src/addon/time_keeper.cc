#include <chrono>

#include "time_keeper.h"

#include <SDL.h>

#define HUNDRED_MILLISEC (100 * 1000000)

struct PrivateData {
  long base_micro;
  long next_micro;
  int  accumulate;
};

long getNowMicrosec() {
  auto init_time = std::chrono::high_resolution_clock::now();
  long long nanos = std::chrono::duration_cast<std::chrono::nanoseconds>(init_time.time_since_epoch()).count();
  return nanos / 1000;
}

TimeKeeper::TimeKeeper() {
  PrivateData* priv = new PrivateData();
  this->data = priv;
}

TimeKeeper::~TimeKeeper() {
  PrivateData* priv = (PrivateData*)this->data;
  delete priv;
}

void TimeKeeper::Init() {
  PrivateData* priv = (PrivateData*)this->data;

  long current_micro = getNowMicrosec();
  long wait_micro = 100 - (current_micro % 100);

  priv->base_micro = current_micro + wait_micro;
  priv->next_micro = priv->base_micro;
  priv->accumulate = 0;

  SDL_Delay(wait_micro / 1000);
}

void TimeKeeper::WaitNextFrame() {
  PrivateData* priv = (PrivateData*)this->data;

  long current_micro = getNowMicrosec();

  long inc = 1;
  long delta = current_micro - priv->next_micro;
  if (delta >= 16666) {
    inc += delta / 16666;
  }

  // Add to next_micro
  priv->accumulate += inc;
  if (priv->accumulate >= 3) {
    int chunk = priv->accumulate / 3;
    priv->base_micro = priv->base_micro + 50000 * chunk;
    priv->accumulate = priv->accumulate - (chunk * 3);
  }
  priv->next_micro = priv->base_micro + (priv->accumulate * 16666);

  if (delta >= 16666) {
      // Missed frames, wait only the remainder of the next frame
      int total = (inc)*16666;
      int wait = total - delta;
      SDL_Delay(wait / 1000);
      return;
  }

  int wait = 16666 - delta;
  SDL_Delay(wait / 1000);
}
