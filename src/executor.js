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
    this._lockTime = true; // TODO: fix me!
  }

  clear() {
    this._initialize();
  }

  execApp(drawFunc) {
    let renderID = makeRenderID();
    let self = this;
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

  _execNextFrame(drawFunc) {
    if (drawFunc) {
      drawFunc();
      this.nextFrame();
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

  nextFrame() {
    if (this._numFrames > 0) {
      this._numFrames--;
      if (this._numFrames == 0) {
        if (this._postRunFunc) {
          this._postRunFunc();
          this._postRunFunc = null;
        }
      }
    }
    this.tick += 1;
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
