class Component {
  name() {
    throw new Error(`Component must implement method "name"`);
  }
}


function isValidName(name) {
    return (name == 'field' || name == 'palette' ||
            name == 'scroll' ||
            name == 'tileset' || name == 'colorspace');
}


function ensureValidName(name) {
  if (!isValidName(name)) {
    throw new Error(`unknown component "${name}"`);
  }
}


module.exports.Component = Component;
module.exports.isValidName = isValidName;
module.exports.ensureValidName = ensureValidName;
