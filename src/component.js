class Component {
  kind() {
    throw new Error(`Component must implement method "kind"`);
  }
}


function isValidKind(kind) {
    return (kind == 'field' || kind == 'palette' ||
            kind == 'scroll' ||
            kind == 'tileset' || kind == 'colorspace');
}


function ensureValidKind(kind) {
  if (!isValidKind(kind)) {
    throw new Error(`unknown component "${kind}"`);
  }
}


module.exports.Component = Component;
module.exports.isValidKind = isValidKind;
module.exports.ensureValidKind = ensureValidKind;
