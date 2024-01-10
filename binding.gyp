{
  "targets": [
    {
      "target_name": "native",
      "dependencies" : [
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
        "src/addon/native.cc",
        "src/addon/sdl_backend.cc",
        "src/addon/rpi_backend.cc",
        "src/addon/adafruithat_backend.cc",
      ],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")",
        "<!@(node ./tools/locate_sdl include)",
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
        "<!(node ./tools/locate_sdl symbol)",
      ]
    }
  ]
}
