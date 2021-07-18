module.exports = function(config) {
  config.set({
    frameworks: ['mocha', 'webpack'],
    files: [
      'test/web/**/*.js',
      {pattern: 'test/testdata/*.png', watched: false, included: false, served: true},
      'dist/raster.min.js'
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
      '/img/': '/base/test/testdata/'
    },
    webpack: {
    }
  })
}
