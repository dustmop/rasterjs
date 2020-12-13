function destructure(param_spec, row) {
  let fname = row[0];
  let values = row[1];

  // TODO: Handle optional parameters.
  let want = param_spec.length;
  let got = values.length;
  // TODO: Handle empty arguments
  let first_param = values[0];

  if (got == 1 && isObject(first_param)) {
    // Object containing named parameters.
    let result = [];
    let haveKeys = Object.keys(first_param);
    for (let i = 0; i < param_spec.length; i++) {
      let [n, t, required] = splitParam(param_spec[i]);
      // TOOD: Split spec into name and type
      let pos = haveKeys.indexOf(n);
      if (pos == -1) {
        if (!required) {
          continue;
        }
        throw `function ${fname} missing parameter ${n}`;
      }
      haveKeys.splice(pos, 1);
      result.push(first_param[n]);
    }

    // Validate there's no unknown parameters passed to the function.
    if (haveKeys.length == 1) {
      let f = haveKeys[0];
      throw `function ${fname} unknown parameter ${f}`;
    } else if (haveKeys.length > 1) {
      throw `function ${fname} unknown parameters ${haveKeys}`;
    }
    return result;
  }

  // Normal list of unnamed parameters passed to the function.
  if (want == got) {
    // TODO: Handle type conversions.
    return values;
  }
  throw `function ${fname} expected ${want} arguments, got ${got}`
}

function isObject(thing) {
  if (thing === null) {
    return false;
  }
  return (typeof thing === 'object' && !Array.isArray(thing));
}

function splitParam(spec) {
  let i = spec.indexOf(':');
  if (i != -1) {
    let n = spec.slice(0, i);
    let t = spec.slice(i + 1);
    return [n, t, true];
  }
  i = spec.indexOf('?');
  if (i != -1) {
    let n = spec.slice(0, i);
    let t = spec.slice(i + 1);
    return [n, t, false];
  }
  throw `IMPLEMENT ME: ${spec}`
}

module.exports = destructure;
