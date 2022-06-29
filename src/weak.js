class Ref {
  constructor(obj) {
    this._obj = obj;
  }

  deref() {
    return this._obj;
  }
}

module.exports.Ref = Ref;
