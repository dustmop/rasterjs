const http = require('http');
const PNG = require('pngjs').PNG;
const PORT = 8444;

class HTTPDisplay {
  constructor() {
    return this;
  }

  initialize() {
    this._image = null;
  }

  name() {
    return 'http';
  }

  setRenderer(renderer) {
    this.renderer = renderer;
  }

  registerEventHandler(eventName, region, callback) {}

  renderLoop(nextFrame) {
    this.nextFrame = nextFrame;
    const server = http.createServer(this.requestListener.bind(this));
    console.log(`listening at http://localhost:${PORT}`);
    server.listen(PORT);
  }

  requestListener(req, res) {
    if (!this._image) {
      this.nextFrame();
      let renderedLayers = this.renderer.render();
      let surf = renderedLayers[0];
      this._image = {
        width: surf.width,
        height: surf.height,
        data: surf.buff,
      };
    }
    let buffer = PNG.sync.write(this._image);
    res.setHeader('Content-Type', 'image/png');
    res.write(buffer, 'binary');
    res.end(null, 'binary');
  }

}

module.exports.HTTPDisplay = HTTPDisplay;

