var assert = require('assert');
var ra = require('../src/lib.js');
var webglDisplay = require('../src/webgl_display.js');

describe('webgl display', function() {
  it('click region', function() {
    ra.resetState();

    let gotClicks = [];
    function getClick(e) {
      gotClicks.push(e);
    }

    global.document = {
      addEventListener: function(){},
    };

    let display = new webglDisplay.WebGLDisplay();
    display.setSceneSize(100, 100);
    display.handleEvent('click', {x: 20, y: 10, w: 40, h: 50}, getClick);
    display.handleEvent('click', {x: 70, y: 80, w: 6, h: 10}, getClick);
    // TODO: Order shouldn't matter for the null-region case
    display.handleEvent('click', null, getClick);

    display._processClick({offsetX: 55, offsetY: 22});
    display._processClick({offsetX: 72, offsetY: 83});
    display._processClick({offsetX: 78, offsetY: 83});

    let expectClicks = [
      {x: 35, y: 12},
      {x:  2, y:  3},
      {x: 78, y: 83},
    ];

    assert.deepEqual(gotClicks, expectClicks);
  });

});
