{
  "targets": [
    {
      "target_name": "native",
      "dependencies" : [
        "./deps/libpng.gyp:libpng"
      ],
      "cflags!": [
        "-fno-exceptions"
        "-Wall",
        "-Wno-unused-parameter",
        "-Wno-missing-field-initializers",
        "-Wextra",
      ],
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
        "./deps/libpng",
      ],
      "libraries": [
        "<!@(node ./tools/locate_sdl lib)",
      ],
      "defines": [
        "_THREAD_SAFE",
        "ENABLE_ARG_CHECKING",
        "ENABLE_IMAGE",
        "ENABLE_TTF",
        "NAPI_DISABLE_CPP_EXCEPTIONS",
      ]
    }
  ]
}
