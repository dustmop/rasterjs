const destructure = require('./destructure.js');

////////////////////////////////////////

function Runner() {
  this.cmd = null;
  this.methods = null;
  this.then = null;
  return this;
}

////////////////////////////////////////

function Commander(owner) {
  this.owner = owner;
  return this;
}

Commander.prototype.push = function(row) {
  let data = JSON.stringify(row);
  console.log(`${data}`);
}

////////////////////////////////////////

function MethodSet(owner) {
  this.owner = owner;
  return this;
}

MethodSet.prototype.show = function() {
  console.log(`show!`);
}

////////////////////////////////////////

function justDo(cb) {
  cb();
}

function start(callback) {
  let r = new Runner();
  r.cmd = new Commander(r);
  r.methods = new MethodSet(r);
  r.then = justDo;
  callback(r);
}

module.exports.start = start;
