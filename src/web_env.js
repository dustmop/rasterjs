const displayWebGL = require('./display_webgl.js');
const plane = require('./plane.js');
const resources = require('./resources.js');
const rawBuffer = require('./raw_buffer.js');

function makeResources() {
  return new resources.Resources();
}

function makeDisplay() {
  return new displayWebGL.Display();
}

function makeRawBuffer(res) {
  // TODO: raw_buffer constructor should accept resources
  return new rawBuffer.RawBuffer();
}

function getOptions() {
  return {};
}

module.exports.makeDisplay = makeDisplay;
module.exports.makeRawBuffer = makeRawBuffer;
module.exports.makeResources = makeResources;
module.exports.getOptions = getOptions;
