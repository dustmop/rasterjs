function Logger() {
  return this;
}

function sourceLocation(height) {
  let err = new Error();

  let stack = err.stack.split('\n');
  let raCall = stack[height+0];
  let client = stack[height+1];

  let scriptName = 'app.js';
  let lineNum = parseInt(client.split(':')[1])
  let funcName = raCall.split(' ')[5];
  return [scriptName, lineNum, funcName];
}

Logger.prototype.log = function(str, height) {
  let shouldDisplay = false;
  if (typeof process !== 'undefined' && process && process.argv) {
    if (process.argv.includes('-v')) {
      shouldDisplay = true;
    }
  }
  if (!shouldDisplay) {
    return;
  }
  let [scriptName, lineNum, funcName] = sourceLocation(height);
  let prefix = `${scriptName}:${lineNum} [${funcName}]`;
  console.log(`[LOG] ${prefix} ${str}`);
}

module.exports.Logger = Logger;
