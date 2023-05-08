module.exports = function(config) {
  config.set({
    client: {
      args: parseTestPattern(process.argv)
    },
    frameworks: ['mocha', 'webpack'],
    files: [
      'test/web/**/*.js',
      {pattern: 'test/testdata/*.jpg', watched: false, included: false, served: true},
      {pattern: 'test/testdata/*.png', watched: false, included: false, served: true},
      {pattern: 'test/testdata/*.yaff', watched: false, included: false, served: true},
      'dist/raster.dev.js'
    ],
    plugins: [
      'karma-mocha',
      'karma-webpack',
      'karma-firefox-launcher'
    ],
    preprocessors: {
      'src/**/*.js': ['webpack']
    },
    reporters: ['progress'],
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    browsers: ['Firefox', 'FirefoxDeveloper', 'FirefoxNightly', 'FirefoxHeadless'],
    autoWatch: false,
    concurrency: Infinity,
    customLaunchers: {
      FirefoxHeadless: {
        base: 'Firefox',
        flags: ['-headless'],
      },
    },
    proxies: {
      '/img/': '/base/test/testdata/',
      '/asset/': '/base/test/testdata/',
    },
    webpack: {
    }
  })
}

// Ability to run tests 1 at a time, by name.
// Source: https://medium.com/@bebraw/running-individual-tests-with-karma-mocha-89aece8ba18b
// Example:
//   `npm run web-test -- "basic"` // runs 4 tests from test/web/basic.js
//   `npm run web-test -- "basic draw"` // run 1 test from test/web/basic.js
function parseTestPattern(argv) {
  var found = false;
  var pattern = argv.map(function(v) {
    if (found) {
      return v;
    }
    if (v === '--') {
      found = true;
    }
  }).filter(function(a) {return a}).join(' ');
  return pattern ? ['--grep', pattern] : [];
}
