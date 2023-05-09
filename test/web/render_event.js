describe('render', function () {
  it('callback event', function(success) {
    let require = window['require'];
    let ra = require('raster');
    ra.resetState();

    ra.on('render', ()=>{
      success();
    });

    ra.setSize(4, 4);
    ra.run();
  });
});
