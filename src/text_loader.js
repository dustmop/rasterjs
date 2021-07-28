function TextLoader(resources) {
  this.resources = resources;
  return this;
}

TextLoader.prototype.loadFont = function(filename) {
  let self = this;
  let file = this.resources.openText(filename);
  let font = {
    file: file,
    glyphs: null,
  };
  file.handleFileRead = function(content) {
    font.glyphs = self.parseFont(content);
  }
  if (file.content) {
    file.handleFileRead(file.content);
  }
  return font;
}

TextLoader.prototype.parseFont = function(content) {
  let font = {};

  let labelRegex = /(\w{2}):/;
  let rowRegex = /\t([-#]+)$/;

  let currLabel = null;
  let currGlyph = [];

  let lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    if (line == '') {
      font[currLabel] = currGlyph;
      currLabel = null;
      currGlyph = [];
      continue;
    }

    if (!line.startsWith('\t')) {
      let found = line.match(labelRegex);
      if (found) {
        currLabel = found[1];
        // Remove the label
        line = line.slice(currLabel.length);
      } else {
        // TODO: Handle !found
      }
    }

    let found = line.match(rowRegex);
    if (found) {
      let pixels = found[1];
      currGlyph.push(pixels);
    } else {
      // TODO: Handle !found
    }

  }

  return font;
}

module.exports.TextLoader = TextLoader;
