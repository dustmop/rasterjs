describe('main', function () {
  describe('#endsWith()', function () {
    it('make node', function(success) {
      let ra = window['require']('raster');
      ra.setSize({w: 8, h: 8});
      ra.fillBackground(4);
      ra.setColor(0x22);
      ra.drawDot(7, 5);
      ra.drawDot(5, 7);
      ra.fillRect(6, 6, 2, 2);

      ra.show(null, function() {
        var canvas = document.getElementsByTagName('canvas')[0];
        var ctx = canvas.getContext('2d');
        compareImage(canvas, 'img/fill_clear.png', function(err) {
          if (err) { console.log(err); throw err; }
          success();
        });

      });
    });
  });
});

function compareImage(left, right, callback) {
  // Assume left is a canvas
  let ctx = left.getContext('2d');
  let leftImgData = ctx.getImageData(0, 0, left.width, left.height);

  // Assume right is a string, url to an image file
  let goldenImg = document.createElement('img');
  goldenImg.src = right;
  goldenImg.addEventListener('load', function() {
    let target = document.createElement('canvas');
    target.width = goldenImg.width;
    target.height = goldenImg.height;
    let ctx = target.getContext('2d');
    ctx.drawImage(goldenImg, 0, 0);
    let rightImgData = ctx.getImageData(0, 0, target.width, target.height);
    let leftLen = leftImgData.data.length;
    let rightLen = rightImgData.data.length;
    if (leftLen != rightLen) {
      return callback(`mismatch, length: ${leftLen} <> ${rightLen}`);
    }

    let match = true;
    for (let k = 0; k < leftLen; k++) {
      if (k % 4 == 3) { continue; }
      if (leftImgData.data[k] != rightImgData.data[k]) {
        let a = leftImgData.data[k];
        let b = rightImgData.data[k];
        console.log(`mismatch data[${k}]: ${a} <> ${b}`);
        match = false;
      }
    }
    if (!match ) {
      return callback(`mismatch, data`);
    }

    callback(null);
  });
  goldenImg.addEventListener('error', function(e) {
    callback(`not found: ${right}`);
  });
}
