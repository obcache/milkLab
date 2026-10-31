cmake_minimum_required(VERSION 3.21)
project(milkLabPreview LANGUAGES C CXX)
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
if(NOT EMSCRIPTEN)
  message(FATAL_ERROR "Configure with emcmake cmake. milkLab preview requires Emscripten/WebGL2.")
endif()
if(NOT PROJECTM_SOURCE_DIR)
  get_filename_component(PROJECTM_SOURCE_DIR "${CMAKE_CURRENT_SOURCE_DIR}/../../projectm" ABSOLUTE)
endif()
set(ENABLE_SYSTEM_PROJECTM_EVAL OFF CACHE BOOL "" FORCE)
set(ENABLE_PLAYLIST OFF CACHE BOOL "" FORCE)
set(ENABLE_INSTALL OFF CACHE BOOL "" FORCE)
set(BUILD_TESTING OFF CACHE BOOL "" FORCE)
set(BUILD_SHARED_LIBS OFF CACHE BOOL "" FORCE)
add_subdirectory("${PROJECTM_SOURCE_DIR}" projectm)
add_executable(milklab-projectm preview.cpp)
target_link_libraries(milklab-projectm PRIVATE projectM)
target_include_directories(milklab-projectm PRIVATE "${PROJECTM_SOURCE_DIR}/vendor/projectm-eval/projectm-eval/api")
target_compile_options(milklab-projectm PRIVATE -fexceptions)
target_link_options(milklab-projectm PRIVATE
  --no-entry -fexceptions
  "-sMODULARIZE=1" "-sEXPORT_ES6=1" "-sEXPORT_NAME=createProjectM"
  "-sENVIRONMENT=web,node" "-sMIN_WEBGL_VERSION=2" "-sMAX_WEBGL_VERSION=2"
  "-sALLOW_MEMORY_GROWTH=1" "-sDISABLE_EXCEPTION_CATCHING=0"
  "-sEXPORTED_RUNTIME_METHODS=['ccall','UTF8ToString','HEAPF32']"
  "-sEXPORTED_FUNCTIONS=['_ml_create','_ml_destroy','_ml_resize','_ml_load','_ml_error','_ml_frame','_ml_pcm','_ml_validate','_ml_line','_ml_column','_malloc','_free']")
set_target_properties(milklab-projectm PROPERTIES SUFFIX ".mjs")
