{
  "targets": [
    {
      "target_name": "native",
      "cflags!": [ "-fno-exceptions" ],
      "cflags_cc!": [ "-fno-exceptions" ],
      "sources": [
        "src/addon/draw_polygon.cc",
        "src/addon/native.cc",
        "src/addon/rasterjs.cc",
        "src/addon/rgb_mapping.cc",
      ],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")",
        "/usr/local/include/SDL2",
      ],
      "libraries": [
        "/usr/local/lib/libSDL2.dylib"
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
