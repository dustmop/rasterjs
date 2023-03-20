const fs = require('fs');
const path = require('path');
const xmlParser = require('fast-xml-parser');
const ra = require('../lib.js');
const field = require('../field.js');
const tileset = require('../tiles.js');

class TiledImporter {
  constructor() {}

  load(filename) {
    let content = fs.readFileSync(filename).toString();
    if (this._appearsToBeJson(content)) {
      return this._loadAsJson(filename, content);
    }
    return this._loadAsXml(filename, content);
  }

  _appearsToBeJson(content) {
    return (content[0] == '{' || content[0] == '[');
  }

  _loadAsJson(filename, content) {
    let structure = JSON.parse(content);
    let firstLayer = structure.layers[0];
    let fieldHeight = firstLayer.height;
    let fieldWidth = firstLayer.width;
    let fieldData = firstLayer.data;

    let pl = new field.Field();
    pl.setSize(fieldWidth, fieldHeight);
    pl.fill(fieldData.map((e)=>e-1));

    let rootpath = path.dirname(filename);
    let imagepath = path.join(rootpath, structure.tilesets[0].image);
    let image = ra.loadImage(imagepath);

    let detail = {
      tile_width: structure.tilewidth,
      tile_height: structure.tileheight,
    }
    let ts = new tileset.Tileset(detail);
    ts.addFrom(image, true);

    return {
      field: pl,
      tileset: ts,
    }
  }

  _loadAsXml(filename, content) {
    let options = {ignoreAttributes: false, attributeNamePrefix : "@_"};
    let parser = new xmlParser.XMLParser(options);
    let xmlDoc = parser.parse(content);
    let dataObj = xmlDoc.map.layer.data['#text'];
    let fieldData = dataObj.replace('\n', '').split(',');

    let imageObj = xmlDoc.map.tileset.image;
    let rootpath = path.dirname(filename);
    let imagepath = path.join(rootpath, imageObj['@_source']);
    let image = ra.loadImage(imagepath);

    let fieldWidth = parseInt(xmlDoc.map['@_width'], 10);
    let fieldHeight = parseInt(xmlDoc.map['@_height'], 10);
    let tilewidth = parseInt(xmlDoc.map['@_tilewidth'], 10);
    let tileheight = parseInt(xmlDoc.map['@_tileheight'], 10);

    let pl = new field.Field();
    pl.setSize(fieldWidth, fieldHeight);
    pl.fill(fieldData.map((e)=>e-1));

    let detail = {
      tile_width: tilewidth,
      tile_height: tileheight,
    }
    let ts = new tileset.Tileset(detail);
    ts.addFrom(image, true);

    return {
      field: pl,
      tileset: ts,
    }
  }

}

module.exports.TiledImporter = TiledImporter;
