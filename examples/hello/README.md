## How to run

Clone this repo using `git clone`

Grab the [latest release](https://github.com/dustmop/rasterjs/releases), or build your own with `npm run build`

Put the file `raster.min.js` into this directory

`npm install -g simplehttpserver`

`simplehttpserver` and open your browser to `http://localhost:8000`

## Development

Optionally, you can create a development version of raster.js by running `npm run dev`. This will create `raster.dev.js`. Edit the file index.html to use this bundle instead.

If you wish to rename the main file away from `app.js`, remember to also modify the including script tag in `index.html`.
