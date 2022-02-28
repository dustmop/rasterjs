function isPlane(obj) {
  return obj.constructor.name == 'Plane' || obj.constructor.name == 'ImagePlane';
}

function isNumber(obj) {
  return typeof obj == 'number';
}

function isInteger(obj) {
  return Number.isInteger(obj);
}

function isArray(obj) {
  return Array.isArray(obj);
}

function isInterrupts(obj) {
  return obj.constructor.name == 'Interrupts';
}

module.exports.isPlane   = isPlane;
module.exports.isNumber  = isNumber;
module.exports.isInteger = isInteger;
module.exports.isArray = isArray;
module.exports.isInterrupts = isInterrupts;
