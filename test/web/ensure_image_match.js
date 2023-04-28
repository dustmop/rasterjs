function ensureImageMatch(expect_filename, callback) {
  var canvas = document.getElementsByTagName('canvas')[0];
  var ctx = canvas.getContext('2d');
  compareImage(canvas, expect_filename, function(err) {
    if (err) { console.log(err); throw err; }
    callback();
  });
}

function compareImage(left, right, callback) {
  // Assume left is a canvas
  let ctx = left.getContext('2d');
  let leftImgData = ctx.getImageData(0, 0, left.width, left.height);

  let dataURL = left.toDataURL();

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
      console.log(dataURL);
      return callback(`mismatch, length: ${leftLen} <> ${rightLen}`);
    }

    let match = true;
    for (let k = 0; k < leftLen; k++) {
      if (k % 4 == 3) { continue; }
      if (leftImgData.data[k] != rightImgData.data[k]) {
        let a = leftImgData.data[k];
        let b = rightImgData.data[k];
        match = false;
      }
    }
    if (!match) {
      console.log(dataURL);
      return callback(`mismatch, data`);
    }

    callback(null);
  });
  goldenImg.addEventListener('error', function(e) {
    callback(`not found: ${right}`);
  });
}
