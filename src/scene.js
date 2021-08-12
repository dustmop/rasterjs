const colorSet = require('./color_set.js');

function Scene(resources, env, rgbMap) {
  this.colorSet = new colorSet.Set(rgbMap);
  this.resources = resources;
  this.saveService = resources;
  this.env = env;
  this.font = null;
  return this;
}

Scene.prototype.clearPlane = function(plane) {
  plane.clear();
  plane.rawBuffer.useColors(this.colorSet);
}

module.exports.Scene = Scene;
