const types = require('./types.js');


class DescribeSpec {
  constructor(choices, allowPositional) {
    this.choices = choices;
    this.allowPositional = allowPositional;
    return this;
  }
}

function build(spec) {
  let choices = [];
  let mapping = {};
  let needed = 0;
  let row = [];
  let allowPositional = true;
  for (k = 0; k < spec.length; k++) {
    let p = spec[k];
    if (p == '!name') {
      allowPositional = false;
      continue;
    }
    if (p == '||') {
      choices.push({row: row, mapping: mapping, needed: needed});
      row = [];
      mapping = {};
      needed = 0;
      continue;
    }
    let param = toParam(p);
    mapping[param.name] = row.length;
    row.push(param);
    if (param.req) {
      needed++;
    }
  }
  if (row.length > 0) {
    choices.push({row: row, mapping: mapping, needed: needed});
  }
  return new DescribeSpec(choices, allowPositional);
}

function toParam(paramText) {
  let pos = paramText.indexOf(':');
  if (pos != -1) {
    let [name, suffixText] = paramText.split(':');
    let [type, def] = suffixText.split('=');
    if (def) {
      throw new Error(`cannot have default for required param ${paramText}`);
    }
    return {name: name, type: type, req: true, def: null};
  }
  pos = paramText.indexOf('?');
  if (pos != -1) {
    let [name, suffixText] = paramText.split('?');
    let [type, def] = suffixText.split('=');
    if (def) {
      def = typeCoerce(def, type);
    }
    return {name: name, type: type, req: false, def: def};
  }
  pos = paramText.indexOf('=');
  if (pos != -1) {
    let [name, type] = paramText.split('=');
    return {name: name, type: type, req: true, def: null, check: true};
  }
  throw new Error(`could not convert param ${paramText}`);
}

function from(fname, paramSpec, args, converter) {
  let err = null;
  let spec = build(paramSpec);
  for (let i = 0; i < spec.choices.length; i++) {
    let choice = spec.choices[i];
    let match = tryMatch(spec, fname, choice, args);
    if (match.values) {
      if (i > 0 && converter) {
        return converter(i, match.values);
      }
      return match.values;
    }
    if (err == null) {
      err = match.err;
    }
  }
  throw new Error(`function '${fname}' ${err}`);
}

function tryMatch(spec, fname, choice, args) {
  let row = choice.row;
  let allowed = row.length;
  let needed = choice.needed;
  let mapping = choice.mapping;
  if (args.length == 0) {
    return tryMatchNamedParam(choice, {});
  }
  if (args.length == 1 && isRawObject(args[0])) {
    return tryMatchNamedParam(choice, args[0]);
  }
  if (!spec.allowPositional) {
    // TODO: Should this check move up to `from`?
    throw new Error(`cannot pass positional arguments to ${fname}`);
  }
  return tryMatchPositionalParam(choice, args);
}

function tryMatchNamedParam(choice, argMap) {
  let row = choice.row;
  let allowed = row.length;
  let needed = choice.needed;
  let mapping = choice.mapping;

  // TODO: This fails if any of the values are `undefined`
  let haveArgKeys = Object.keys(argMap);
  let values = [];
  for (let i = 0; i < row.length; i++) {
    let p = row[i];
    let v = argMap[p.name];
    if (v !== undefined) {
      values.push(toValueLike(v, p));
      let pos = haveArgKeys.indexOf(p.name);
      haveArgKeys.splice(pos, 1);
    } else if (!p.req) {
      values.push(toValueLike(null, p));
    } else {
      return {err: `missing parameter ${p.name}`};
    }
  }

  // Validate there's no unknown parameters passed to the function.
  if (haveArgKeys.length == 1) {
    let f = haveArgKeys[0];
    return {err: `unknown parameter ${f}`};
  } else if (haveArgKeys.length > 1) {
    return {err: `unknown parameters ${haveArgKeys}`};
  }

  return {values: values};
}

function tryMatchPositionalParam(choice, args) {
  let row = choice.row;
  let allowed = row.length;
  let needed = choice.needed;
  let mapping = choice.mapping;

  if (args.length < needed || args.length > allowed) {
    return {err: `expected ${allowed} arguments, got ${args.length}`};
  }

  let allowOmitable = true;

  let values = [];
  let n = 0; // arg index

  for (let i = 0; i < row.length; i++) {
    let p = row[i];
    if (p.req) {
      allowOmitable = false;
      if (p.check) {
        if (!valueMatchType(args[n], p)) {
          let got = getType(args[n]);
          return {err: `arg ${n} bad type, got:${got} want:${p.type}`};
        }
      }
    } else if (allowOmitable) {
      if (!valueMatchType(args[n], p) && !p.def) {
        values.push(null);
        continue;
      }
    }
    if (n >= args.length) {
      if (!p.req) {
        continue;
      }
      return {err: `argument ${n} not found`};
    }
    values.push(toValueLike(args[n], p));
    n++;
  }
  return {values: values};
}

function isRawObject(thing) {
  if (thing === null) {
    return false;
  }
  if (typeof thing === 'object' && !Array.isArray(thing)) {
    return (thing.constructor.name === 'Object');
  }
  return false;
}

function toValueLike(value, param) {
  if (!value && param.def) {
    return param.def;
  }
  return typeCoerce(value, param.type);
}

function getType(value) {
  if (value == null) {
    return 'null';
  }
  let type = typeof value;
  if (type == 'object') {
    return value.constructor.name;
  }
  return '?';
}

function valueMatchType(value, param) {
  let type = param.type;
  if (type == 'i') {
    // integer
    return types.isInteger(value);
  } else if (type == 'n') {
    // number
    return types.isNumber(value);
  } else if (type == 'ps') {
    // points
    if (!types.isArray(value)) {
      return false;
    }
    for (let elem of value) {
      if (!types.isNumber(elem)) {
        return false;
      }
    }
    return true;
  } else if (type == 'a' || type == 'any') {
    // any
    return true;
  } else if (type == 's') {
    // string
    return types.isString(value);
  } else if (type == 'b') {
    // bool
    return types.isBool(value);
  } else if (type == 'o') {
    // object
    return types.isObject(value);
  } else if (type == 'component') {
    // component
    if (types.isPlane(value) || types.isPalette(value) ||
        types.isTileset(value) || types.isColorspace(value) ||
        types.isInterrupts(value)) {
      return true;
    }
    return false;
  } else if (type == 'f') {
    // function
    return types.isFunction(value);
  }
  throw new Error(`TODO: type == ${type}`);
}

function typeCoerce(value, type) {
  if (type == 'i') {
    // int
    return Math.floor(Number(value));
  } else if (type == 'n') {
    // number
    return Number(value);
  } else if (type == 'ps') {
    // points
    // TODO: Validate and/or convert
    return value;
  } else if (type == 'a' || type == 'any') {
    // any
    return value;
  } else if (type == 's') {
    // string
    if (!value) {
      return '';
    }
    return value.toString();
  } else if (type == 'b') {
    // bool
    return !!value;
  } else if (type == 'o') {
    // object
    if (!value) {
      return null;
    }
    if (value.constructor.name == 'Object') {
      return value;
    }
    throw new Error(`could not convert to object: ${value}`);
  } else if (type == 'component') {
    // component
    if (!value) {
      return null;
    }
    let objType = value.constructor.name;
    let allowed = ['Plane', 'Palette', 'Tileset', 'Colorspace', 'Interrupts'];
    if (allowed.indexOf(objType) > -1) {
      return value;
    }
    throw new Error(`could not convert to component: ${value}`);
  } else if (type == 'f') {
    // function
    if (!value) {
      return null;
    }
    if (value.constructor.name == 'Function') {
      return value;
    }
    throw new Error(`could not convert to function: ${value}`);
  } else {
    throw new Error(`unknown type: ${type}`);
  }
}

module.exports.from = from;
module.exports.build = build;
module.exports.DescribeSpec = DescribeSpec;
