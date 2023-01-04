const weak = require('./weak.js');


class Executor {
  constructor(display, refOwner) {
    this.display = display;
    this.refOwner = refOwner;
    this._initialize();
  }

  _initialize() {
    this._forceRender = true; // always render first frame
    this._startTime = new Date();
    this.time = 0.0;
    this.tick = 0;
    this._fpsPrevTime = null;
    this._lockTime = true; // TODO: fix me!
  }

  clear() {
    this._initialize();
  }

  execApp(drawFunc) {
    let renderID = makeRenderID();
    this.display.beginExec(new weak.Ref(this));
    let execNextFrame = this._execNextFrame.bind(this);
    this.display.beginLoop(renderID);
    this.display.appLoop(renderID, ()=>{ return execNextFrame(drawFunc); });
  }

  setLockTime(state) {
    this._lockTime = !!state;
  }

  appQuit() {
    this.display.stopRunning();
  }

  setLifetime(numFrames, postRunFunc) {
    this._numFrames = numFrames;
    this._postRunFunc = postRunFunc;
  }

  setPauseState(state) {
    this.isPaused = !!state;
  }

  _execNextFrame(drawFunc) {
    if (this.isPaused && !this._forceRender) {
      return false;
    }

    // frame skipping, allows us to lock the framerate at 60fps
    if (!this._isReadyForNextFrame()) {
      return false;
    }

    // TODO: test that setting ra.tick doesn't work, drawFunc
    // uses the original value
    this.updateSceneTime();
    if (drawFunc) {
      drawFunc();
      // TODO: slowdown?
      this.advanceTick(this.isPaused ? 0 : 1);
      return true;
    } else if (this._forceRender) {
      this._forceRender = false;
      return true;
    } else if (this._postRunFunc) {
      this._postRunFunc();
      this._postRunFunc = null;
      return false;
    }
    return false;
  }

  _isReadyForNextFrame() {
    // if the display is not real-time, always ready for next frame
    if (!this.display.isRealTime()) {
      return true;
    }

    // make sure that enough time has passed
    if (this._fpsPrevTime == null) {
      this._fpsPrevTime = this._startTime;
    }
    let deltaMs = new Date() - this._fpsPrevTime;
    if (deltaMs >= 13) {
      this._fpsPrevTime = new Date(this._fpsPrevTime.getTime() + 16);
      return true;
    } else {
      return false;
    }
  }

  advanceTick(delta) {
    if (this._numFrames > 0) {
      if (delta != 1) {
        throw new Error(`can only use numFrames with {delta: 1}`);
      }
      this._numFrames--;
      if (this._numFrames == 0) {
        if (this._postRunFunc) {
          this._postRunFunc();
          this._postRunFunc = null;
        }
      }
    }
    this.tick += delta;
    if (this._lockTime) {
      this.time = this.tick / 60.0;
      // TODO: always lock the first N frames, to account for uncertainty
      // in start-up performance
    } else {
      this.time = (new Date() - this._startTime) / 1000;
    }
    this.updateSceneTime();
  }

  updateSceneTime() {
    let scene = this.refOwner.deref();
    scene.time = this.time;
    scene.tick = this.tick;
  }

}


function makeRenderID() {
  let res = '';
  for (let k = 0; k < 20; k++) {
    res += String.fromCharCode(65+Math.floor(Math.random()*26));
  }
  return res;
}


module.exports.Executor = Executor;
