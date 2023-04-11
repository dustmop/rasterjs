var assert = require('assert');
var child_process = require('child_process');
var fs = require('fs');
var path = require('path');
var util = require('../util.js');


const fifteenSecondsInMs = 15 * 1000;
const expectAtLeastFileSize = 100 * 1000;


describe('Example', function() {
  it('build it', function(success) {
    // Test timeout of 15 seconds, this test is slow because we `npm install`
    console.log(`NOTE: example-test takes a long time, up to 15 seconds...`);
    this.timeout(fifteenSecondsInMs);
    // Create temp work directory
    let tmpdir = util.mkTmpDir();
    // Copy the example into the work directory, ch into it
    fs.cpSync('src/contrib/example-web/',
              `${tmpdir}/example-web/`,
              {recursive: true});
    process.chdir(tmpdir + '/example-web');
    // Run npm install
    execCmd('npm install', ()=>{
      // Run build to create dist/main.js
      execCmd('npm run build', ()=>{
        let expectfile = path.join(tmpdir, 'example-web/dist/main.js');
        // Check that the built file has a reasonable size
        let fstat = fs.statSync(expectfile);
        if (fstat.size < expectAtLeastFileSize) {
          assert.fail(`file "${expectfile}" bad size ${fstat.size}`);
        }
        // Test has succeeded
        success();
      });
    });
  });
});


function execCmd(cmd, callback) {
  child_process.exec(cmd, function(err, stdout, stderr) {
    if (err) {
      console.log(stdout);
      console.log(stderr);
      throw err;
    }
    callback();
  });
}
