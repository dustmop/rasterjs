let listenableEvents = ['keypress', 'keydown', 'keyup', 'click',
                        'ready', 'render', 'message', 'dipchange'];
let generalEvents = ['ready', 'render', 'message', 'dipchange'];


class EventManager {
  constructor() {
    this._handlers = {};
    this._pressKeys = {};
  }

  getNativeKey(name, event) {
    // called when an incoming key event has been generated by NativeDisplay
    if (!event.code || Object.keys(event).length != 1) {
      throw new Error(`native event should only have 'code' field`);
    }
    let e = {
      code: event.code,
      key: this.lookupKeyFromCode(event.code),
    };
    if (!e.key && e.code >= 0x20 && e.code < 0x80) {
      // Convert low codes into key characters.
      e.key = String.fromCharCode(e.code);
    }

    if (name == 'keydown') {
      // is key already down? if so, return early
      if (this._pressKeys[e.code]) { return; }
      this._pressKeys[e.code] = true;
    }
    if (name == 'keyup') {
      this._pressKeys[e.code] = false;
    }
    this._dispatch(name, e);
  }

  getNativeClick(event) {
    let handlerList = this._handlers['click'];
    if (!handlerList) { return; }
    for (let handler of handlerList) {
      let [region, callback] = [handler.region, handler.callback];
      let posx = event.basex;
      let posy = event.basey;
      let width = event.width;
      let height = event.height;
      let name = '';
      if (region) {
        posx -= region.x;
        posy -= region.y;
        width = region.w;
        height = region.h;
        name = region.name;
      }
      if (posx < 0 || posy < 0 || posx >= width || posy >= height) {
        continue;
      }
      callback({x: posx, y: posy});
      return;
    }
  }

  getEvent(name, event) {
    if (!generalEvents.includes(name)) {
      let expect = listToString(generalEvents);
      throw new Error(`unknown event "${eventName}", only ${expect} supported`);
    }
    if (name == 'render' || name == 'dipchange') {
      throw new Error(`TODO: implement event ${name}`);
    }
    this._dispatch(name, event);
  }

  lookupKeyFromCode(code) {
    if (code == 0x8) {
      return 'Backspace'
    } else if (code == 0x9) {
      return 'Tab'
    } else if (code == 0x0d) {
      return 'Return'
    } else if (code == 0x804f) {
      return 'ArrowRight';
    } else if (code == 0x8050) {
      return 'ArrowLeft';
    } else if (code == 0x8051) {
      return 'ArrowUp';
    } else if (code == 0x8052) {
      return 'ArrowDown';
    }
  }

  lookupCodeFromWebKey(key) {
    if (key == 'ArrowRight') {
      return 0x804f;
    } else if (key == 'ArrowLeft') {
      return 0x8050;
    } else if (key == 'ArrowUp') {
      return 0x8051;
    } else if (key == 'ArrowDown') {
      return 0x8052;
    }
    return null;
  }

  listenFor(name, region, callback) {
    if (!listenableEvents.includes(name)) {
      let expect = listToString(listenableEvents);
      throw new Error(`unknown event "${eventName}", only ${expect} supported`);
    }
    if (!this._handlers[name]) {
      this._handlers[name] = [];
    }
    this._handlers[name].push({region: region, callback: callback});
  }

  _dispatch(name, event) {
    let handlerList = this._handlers[name];
    if (!handlerList) { return; }
    for (let handler of handlerList) {
      handler.callback(event);
    }
  }
}

function listToString(ls) {
  return ls.map((n)=>`"${n}"`).join(', ');
}

module.exports.EventManager = EventManager;