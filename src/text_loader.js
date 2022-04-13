const tinyFont = require('./font/tiny.js');

function TextLoader(fsacc) {
  this.fsacc = fsacc;
  return this;
}

TextLoader.prototype.loadFont = function(filename, info) {
  let self = this;
  if (filename.endsWith('.yaff')) {
    let file = this.fsacc.readText(filename);
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
  if (filename.endsWith('.png')) {
    this._ensureDetails(info);
    let surface = {};
    let ret = this.fsacc.readImageData(filename, surface);
    let font = {
      glyphs: null,
    };
    this.fsacc.whenLoaded(function() {
      font.glyphs = self.parseGlyphsFromImage(surface, info);
    });
    return font;
  }
}

TextLoader.prototype.createFontResource = function(name) {
  if (name != 'tiny') {
    throw new Error(`only font:tiny is supported`);
  }
  let font = {
    glyphs: null,
  };
  font.glyphs = this.parseFont(tinyFont.content);
  return font;
}

TextLoader.prototype._ensureDetails = function(info) {
  if (!info) {
    throw new Error(`setFont: details not provided`);
  }
  if (!info.char_width) {
    throw new Error(`setFont: details requires char_width`);
  }
  if (!info.char_height) {
    throw new Error(`setFont: details requires char_height`);
  }
  if (!info.charmap) {
    throw new Error(`setFont: details requires charmap`);
  }
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

TextLoader.prototype.parseGlyphsFromImage = function(surface, info) {
  let font = {};
  let charWidth = info.char_width;
  let charHeight = info.char_height;
  let numX = surface.width / charWidth;
  let numY = surface.height / charHeight;
  let minChar = info.charmap[0];
  let maxChar = info.charmap[1];
  for (let charY = 0; charY < numY; charY++) {
    for (let charX = 0; charX < numX; charX++) {
      let currGlyph = [];
      for (let i = 0; i < charHeight; i++) {
        let pixels = [];
        for (let j = 0; j < charWidth; j++) {
          let x = j + charX * charWidth;
          let y = i + charY * charHeight;
          let k = surface.pitch*4*y + x*4;
          let alpha = surface.rgbBuff[k+3];
          if (alpha >= 0x80) {
            pixels.push('#');
          } else {
            pixels.push('-');
          }
        }
        currGlyph.push(pixels);
      }
      let currLabel = (charY*numX + charX + minChar).toString(16);
      font[currLabel] = currGlyph;
    }
  }
  return font;
}

module.exports.TextLoader = TextLoader;
