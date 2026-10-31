#include <projectM-4/projectM.h>
#include <emscripten/html5.h>
#include <emscripten/html5_webgl.h>
#include <GLES3/gl3.h>
#include <string>
#include <exception>
#include <projectm-eval.h>

static projectm_handle engine = nullptr;
static EMSCRIPTEN_WEBGL_CONTEXT_HANDLE context = 0;
static std::string error;
static std::string validationError;
static int validationLine = 1, validationColumn = 1;
static void failed(const char*, const char* message, void*) { error = message ? message : "Preset compilation failed"; }
extern "C" {
const char* ml_validate(const char* source) {
  auto* ctx = projectm_eval_context_create(nullptr, nullptr);
  auto* code = projectm_eval_code_compile(ctx, source);
  validationError.clear();
  if (!code) {
    const char* message = projectm_eval_get_error(ctx, &validationLine, &validationColumn);
    validationError = message ? message : "Expression compilation failed";
  } else projectm_eval_code_destroy(code);
  projectm_eval_context_destroy(ctx);
  return validationError.c_str();
}
int ml_line() { return validationLine; }
int ml_column() { return validationColumn; }
int ml_create() {
  EmscriptenWebGLContextAttributes attrs;
  emscripten_webgl_init_context_attributes(&attrs);
  attrs.majorVersion = 2;
  attrs.alpha = false;
  attrs.antialias = false;
  attrs.depth = false;
  context = emscripten_webgl_create_context("#projectm-canvas", &attrs);
  if (context <= 0) { error = "WebGL2 context creation failed"; return 0; }
  emscripten_webgl_make_context_current(context);
  emscripten_webgl_enable_extension(context, "EXT_color_buffer_float");
  emscripten_webgl_enable_extension(context, "OES_texture_float_linear");
  try {
    engine = projectm_create_with_opengl_load_proc([](const char* name, void*) -> void* {
      return reinterpret_cast<void*>(emscripten_webgl_get_proc_address(name));
    }, nullptr);
    if (!engine) { error = "projectM initialization failed"; return 0; }
    projectm_set_preset_switch_failed_event_callback(engine, failed, nullptr);
    projectm_set_preset_locked(engine, true);
    projectm_set_mesh_size(engine, 48, 36);
    projectm_set_fps(engine, 60);
    return 1;
  } catch (const std::exception& ex) { error = ex.what(); return 0; }
}
void ml_destroy() {
  if (context > 0) emscripten_webgl_make_context_current(context);
  if (engine) { projectm_destroy(engine); engine = nullptr; }
  if (context > 0) { emscripten_webgl_destroy_context(context); context = 0; }
}
void ml_resize(int width, int height) {
  if (!engine) return;
  emscripten_webgl_make_context_current(context);
  emscripten_set_canvas_element_size("#projectm-canvas", width, height);
  projectm_set_window_size(engine, width, height);
}
int ml_load(const char* source) {
  if (!engine) return 0;
  emscripten_webgl_make_context_current(context);
  error.clear();
  try { projectm_load_preset_data(engine, source, false); }
  catch (const std::exception& ex) { error = ex.what(); }
  return error.empty() ? 1 : 0;
}
const char* ml_error() { return error.c_str(); }
void ml_frame() {
  if (!engine) return;
  emscripten_webgl_make_context_current(context);
  glBindFramebuffer(GL_FRAMEBUFFER, 0);
  projectm_opengl_render_frame(engine);
}
void ml_pcm(const float* samples, int count) {
  if (engine && count > 0 && count <= 512) projectm_pcm_add_float(engine, samples, count, PROJECTM_MONO);
}
}
