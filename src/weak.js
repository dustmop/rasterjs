class Ref {
  constructor(obj) {
    this._derefer = function() {
      return obj;
    };
  }

  deref() {
    return this._derefer();
  }
}

module.exports.Ref = Ref;
