function DescribeSpec(choices, allowPositional) {
  this.choices = choices;
  this.allowPositional = allowPositional;
  return this;
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
  throw new Error(`function ${fname} ${err}`);
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

  if (args.length == 1 && needed == 1 && allowed == 2) {
    // Short-cut to handle optional param[0]
    if (!row[0].req) {
      return {values: [null, args[0]]};
    }
  }

  if (args.length < needed || args.length > allowed) {
    return {err: `expected ${allowed} arguments, got ${args.length}`};
  }

  let values = [];
  for (let i = 0; i < row.length; i++) {
    let p = row[i];
    if (i >= args.length) {
      if (!p.req) {
        continue;
      }
      return {err: `argument ${i} not found`};
    }
    values.push(toValueLike(args[i], p));
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
