# Third-party software in milkLab

The preview uses projectM 4.2.0, licensed under LGPL-2.1-or-later. Its exact source revision and build command are recorded in `renderer/engine/provenance.json` inside the desktop artifact (source tree: `public/engine/provenance.json`). The projectM license and copyright notice accompany the engine.

The desktop package includes complete projectM and projectM-Eval source archives, the milkLab wrapper, and rebuild instructions under `resources/app/rebuild/`. The engine JavaScript and WebAssembly files remain replaceable loose files under `resources/app/renderer/engine/`. No modifications were made to the external projectM checkout.

projectM dependencies include projectM-Eval (MIT), HLSLParser (MIT), GLM, GLAD/Khronos, stb_image and its image helpers. Their source notices are retained in the source archive, with native notice text in `renderer/licenses/native.txt` and upstream GLM/GLAD license text in `renderer/licenses/`.

React, CodeMirror, Lezer, Zod, Lucide, and bundled transitive npm dependencies have their license texts in `renderer/licenses/npm.txt`. Electron and Chromium notices are supplied by Electron in the distribution root (`LICENSE` and `LICENSES.chromium.html`).

Normalization behavior was informed by the user's local obspiltMilk preset importer (`E:/Production/Coding/obspiltMilk/src/preset-import.cpp`) and its public project at https://github.com/obcache/obspiltMilk. milkLab implements its own TypeScript import pipeline.

The three starter presets and vector effect illustrations were authored for milkLab. No third-party preset pack or texture library is bundled. A first-party project license has not yet been selected; this development build has not been published or signed.
