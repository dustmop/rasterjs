const weak = require('./weak.js');


class Executor {
  constructor(display, refOwner) {
    this.display = display;
    this.refOwner = refOwner;
    this._initialize();
  }

  _initialize() {
    this._alwaysRenderFirstFrame = true;
    this._startTime = new Date();
    this.time = 0.0;
    this.tick = 0;
    this._lockTime = false;
  }

  execApp(drawFunc) {
    let renderID = makeRenderID();
    let self = this;
    this.display.beginExec(new weak.Ref(this));
    let execNextFrame = this._execNextFrame.bind(this);
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
    }
    this.nextFrame();
    if (this._alwaysRenderFirstFrame) {
      this._alwaysRenderFirstFrame = false;
      return true;
    }
    return false;
  }

  nextFrame() {
    if (this._numFrames > 0) {
      this._numFrames--;
      if (this._numFrames == 0) {
        this.display.stopRunning();
        // TODO: should run after display runs the final step
        if (this._postRunFunc) {
          this._postRunFunc();
        }
      }
    }
    // TODO: rename to this.tick
    this.tick += 1;
    if (this._lockTime) {
      this.time = this.tick / 60.0;
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
