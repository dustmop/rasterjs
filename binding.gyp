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
        "src/addon/filesys_access.cc",
        "src/addon/native.cc",
        "src/addon/png_load_write.cc",
        "src/addon/sdl_display.cc",
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
