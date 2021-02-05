function createProgram(gl, vertex_shader_text, fragment_shader_text) {
  var vertex_shader = loadShader(gl, vertex_shader_text, gl.VERTEX_SHADER);
  var fragment_shader = loadShader(gl, fragment_shader_text, gl.FRAGMENT_SHADER);

  const program = gl.createProgram();
  gl.attachShader(program, vertex_shader);
  gl.attachShader(program, fragment_shader);

  gl.linkProgram(program);
  // Check the link status
  const outcome = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (!outcome) {
      const lastError = gl.getProgramInfoLog(program);
      console.log('Error in program linking:' + lastError);
      gl.deleteProgram(program);
      return null;
  }
  return program;
}

function loadShader(gl, shaderSource, shaderType) {
  // Create the shader object
  const shader = gl.createShader(shaderType);
  // Load the shader source
  gl.shaderSource(shader, shaderSource);
  // Compile the shader
  gl.compileShader(shader);
  // Check the compile status
  const outcome = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (!outcome) {
    const lastError = gl.getShaderInfoLog(shader);
    console.log('*** Error compiling shader \'' + shader + '\':' + lastError + `\n` + shaderSource.split('\n').map((l,i) => `${i + 1}: ${l}`).join('\n'));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}


module.exports.createProgram = createProgram;
