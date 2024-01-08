var assert = require('assert');
var ra = require('../src/lib.js');


describe('Compositor', function() {
  it('render two layers', function() {
    ra.resetState();
    ra.setZoom(2);

    let upper = new ra.DrawableField();
    upper.setSize(16, 16);

    let lower = new ra.DrawableField();
    lower.setSize(16, 16);

    ra.setSize(16, 16);
    ra.useField([lower, upper]);

    let surfaces = ra.renderPrimaryField();
    assert.equal(2, surfaces.length);
  });

  it('with software compositor', function() {
    ra.resetState();
    ra.setZoom(2);

    let upper = new ra.DrawableField();
    upper.setSize(16, 16);

    let lower = new ra.DrawableField();
    lower.setSize(16, 16);

    ra.setSize(16, 16);
    ra.useField([lower, upper]);

    ra._renderer.requirements.forceSoftwareCompositor = true;
    let surfaces = ra.renderPrimaryField();
    assert.equal(1, surfaces.length);
  });
});
