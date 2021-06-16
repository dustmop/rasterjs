{
  "targets": [
    {
      "target_name": "native",
      "cflags!": [ "-fno-exceptions" ],
      "cflags_cc!": [ "-fno-exceptions" ],
      "sources": [
        "src/addon/display_sdl.cc",
        "src/addon/image_load_save.cc",
        "src/addon/native.cc",
        "src/addon/raw_buffer.cc",
        "src/addon/resources.cc",
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
