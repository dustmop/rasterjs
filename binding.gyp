{
  "targets": [
    {
      "target_name": "native",
      "cflags!": [ "-fno-exceptions" ],
      "cflags_cc!": [ "-fno-exceptions" ],
      "sources": [
        "src/addon/draw_polygon.cc",
        "src/addon/line.cc",
        "src/addon/load_image.cc",
        "src/addon/native.cc",
        "src/addon/png_read_write.cc",
        "src/addon/rasterjs.cc",
        "src/addon/rect.cc",
        "src/addon/time_keeper.cc",
      ],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")",
        "<!(node ./tools/locate_sdl include)",
      ],
      "libraries": [
        "<!@(node ./tools/locate_sdl lib)",
        "<!(pkg-config libpng --libs)",
      ],
      "defines": [
        '_THREAD_SAFE',
        'ENABLE_ARG_CHECKING',
        'ENABLE_IMAGE',
        'ENABLE_TTF',
        'NAPI_DISABLE_CPP_EXCEPTIONS'
      ]
    }
  ]
}
