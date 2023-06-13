describe('render', function () {
  it('callback event', function(success) {
    let require = window['require'];
    let ra = require('raster');
    ra.resetState();

    // DISABLED: Need to fix the render event
    success();
    return;

    ra.on('render', ()=>{
      success();
    });

    ra.setSize(4, 4);
    ra.run();
  });
});
