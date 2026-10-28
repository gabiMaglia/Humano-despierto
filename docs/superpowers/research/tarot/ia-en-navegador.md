# IA en el navegador para la síntesis de tiradas de tarot — informe de investigación

**Fecha:** 2026-10-27 · **Alcance:** solo lectura web (WebSearch + WebFetch) · **Para:** Humano Despierto (Next.js 16 / React 19)

**Pregunta:** ¿conviene generar en el navegador del usuario, sin costo de servidor, un párrafo de 150-250 palabras en español rioplatense a partir de un prompt estructurado (cartas, posiciones, significados, dignidades, hilo narrativo)? Público: mayoría en celulares Android/iOS de gama media en Argentina, muchos con datos limitados.

**Respuesta corta:** no para este público. La IA en navegador funciona hoy, pero solo en desktop con GPU o en teléfonos de gama alta, y exige descargar entre 300 MB y 1 GB de pesos. En Argentina el 87% del parque móvil es Android ([StatCounter, sep-2026](https://gs.statcounter.com/os-market-share/mobile/argentina)) y la gama media está perdiendo RAM por la crisis de DRAM. Mientras tanto, la alternativa de servidor con Claude Haiku 5.5 cuesta **~USD 0,0003 por tirada** (USD 3 cada 10.000 tiradas). Recomendación: **(c) híbrido, pero con un orden distinto al propuesto** — reglas + plantillas siempre; Chrome Prompt API (Gemini Nano) como mejora progresiva solo en Chrome desktop, porque ahí el modelo ya está instalado y no hay que descargar nada; y si querés calidad real para todos, Haiku 5.5 en un Server Action, que cuesta menos que el café del mes. No recomiendo WebLLM/Transformers.js en producción para este caso. Detalle y números abajo.

---

## 1. Chrome Built-in AI / Prompt API (Gemini Nano)

### Estado en octubre de 2026
- **Estable en páginas web desde Chrome 148** (desktop). Antes: origin trial en 139-144, extensiones estables desde 138. Fuente: [Intent to Ship en blink-dev, abril 2026](https://groups.google.com/a/chromium.org/g/blink-dev/c/iR6R7-nQeHI) y [docs oficiales del Prompt API](https://developer.chrome.com/docs/ai/prompt-api) (actualizadas 2026-10-21). Queda en origin trial solo el ajuste de parámetros de muestreo (`samplingMode`) en Chrome 148.
- **Plataformas soportadas:** Windows 10/11, macOS 13+, Linux, ChromeOS (solo Chromebook Plus).
- **No soportado:** **Chrome para Android, iOS** y Android WebView. Google dice que está prototipando una versión Android que use el modelo del sistema operativo (AICore), "después del lanzamiento inicial", sin fecha. Es decir: **hoy no existe en el celular**, que es donde está tu público.
- **Edge:** colabora en la spec y la ofrece con otro modelo (Phi-4-mini, y desde Edge 150 un modelo más chico "Aion-1.0-Instruct" que corre en CPU), pero sigue como *developer preview* en canales Canary/Dev, con 20 GB libres de disco. Fuente: [Microsoft Learn — Prompt API](https://learn.microsoft.com/en-us/microsoft-edge/web-platform/prompt-api).
- **Firefox:** posición negativa. **WebKit/Safari:** sin señal. No hay Prompt API en iOS ni en Safari.

### Requisitos de hardware (docs oficiales)
- **22 GB libres** en el volumen del perfil; Chrome borra el modelo si baja de 10 GB.
- **GPU con más de 4 GB de VRAM**, o ruta CPU con **16 GB de RAM y 4 núcleos**.
- Descarga inicial solo en red no medida. El modelo pesa entre **2,7 y 4 GB** según el build ([análisis de Chrome 148](https://pasqualepillitteri.it/en/news/3145/gemini-nano-chrome-built-in-ai-client-side-en); el doc oficial no da la cifra y remite a `chrome://on-device-internals`). La descarga es *browser-wide*: una sola vez por máquina, no por sitio.
- Ventana de contexto ~8K tokens. Sobra para tu prompt de ~800 tokens.

### Español
- Idiomas aceptados oficialmente: **en, ja, es, de, fr**. Español entró en Chrome M140. Hay que declarar `expectedInputs`/`expectedOutputs` con `languages: ['es']` y consultar `LanguageModel.availability()` con esas mismas opciones; si el modelo no soporta el idioma devuelve `NotSupportedError`.
- No encontré evaluaciones públicas de calidad del español de Gemini Nano. Por tamaño (~3B efectivo) y por ser Gemini, la expectativa razonable es "español neutro correcto, no rioplatense"; el voseo habría que forzarlo en el prompt y verificar.

### Política de disponibilidad para tu caso
- Crear la sesión requiere activación del usuario (gesto). `availability()` devuelve `available` / `downloadable` / `downloading` / `unavailable`; con `monitor` se escucha `downloadprogress`.
- **Veredicto:** es la única opción "gratis y sin descargar nada" cuando el modelo ya está presente, pero cubre solamente **Chrome desktop con máquinas potentes**. Para tu público mobile, cero cobertura.

## 2. WebLLM (MLC) y Transformers.js (ONNX Runtime Web)

### Soporte de WebGPU en 2026 (lo que habilita todo esto)
- Chrome/Edge: desde 113 en Windows/macOS/ChromeOS; Linux desde 144 (solo Intel Gen12+). **Chrome Android desde 121.** Samsung Internet 25.
- **Safari 26 (sept-2025) envía WebGPU en macOS, iOS, iPadOS y visionOS** — cita textual del blog de WebKit: "WebGPU is now shipping in Safari 26.0 for macOS, iOS, iPadOS, and visionOS" ([WebKit, 2025-09-15](https://webkit.org/blog/17333/webkit-features-in-safari-26-0/)). Ojo: algunos artículos de 2026 siguen diciendo que iOS está bloqueado; es información vieja.
- Firefox: Windows 141+, macOS Apple Silicon 145/147; sin Linux, sin Android.
- Compilado en [Pinggy, "Run an LLM inside a browser tab" (2026)](https://pinggy.io/blog/run_llm_in_browser_webgpu/).
- Resumen: el 82% de los navegadores globales tienen WebGPU a mitad de 2026, **pero "tener WebGPU" no significa "poder correr un LLM"** (ver pruebas en teléfonos más abajo).

### Modelos chicos: tamaño, VRAM, español

| Modelo | Descarga q4 | VRAM / RAM estimada | Español | Observaciones |
|---|---|---|---|---|
| **SmolLM2 360M Instruct** | 204 MB | ~376 MB | Débil (entrenado casi solo en inglés) | Lo mínimo que corre en 4 GB de RAM; redacción pobre |
| **Gemma 3 270M IT** | ~300 MB (Q8) / ~160 MB (q4) | ~500 MB GPU | Pretrain en 140+ idiomas, sin benchmark multilingüe publicado | IFEval 51,2 vs 80,2 del 1B: sigue instrucciones mal. Google lo posiciona para *fine-tuning* por tarea, no para redactar libre. [Model card](https://huggingface.co/google/gemma-3-270m) |
| **Qwen3 0.6B** | 335 MB | ~1,4 GB | Pretrain en 119 idiomas; sin eval española independiente. Hay fine-tunes comunitarios en español (Tenorio 0.6B, Quipu 0.6B) con benchmarks caseros | Candidato más chico "usable" para texto; prosa correcta pero plana |
| **Gemma 3 1B IT** | 563 MB (WebLLM) / ~1 GB (Q8) | 711 MB - 1,5 GB | 140+ idiomas; leaderboard terceros: 49,3 en comprensión en español | Mejor calidad/tamaño para redacción. IFEval 80,2 |
| **Llama 3.2 1B Instruct** | 695 MB | ~880 MB | Español oficial (8 idiomas) | Similar a Gemma 1B, un poco más pesado |
| **Qwen3 1.7B / Qwen3.5 2B** | ~1 GB | ~2,2 GB | 53,2 en comprensión en español (Qwen3 1.7B) | Ya fuera del alcance de un celular de gama media |
| **SmolLM3 3B** | ~1,8 GB q4 | ~2,5 GB | **Español nativo** (6 idiomas), MLMM HellaSwag ES 65,9 | Calidad buena, pero 3B es desktop-only. [Model card](https://huggingface.co/HuggingFaceTB/SmolLM3-3B) |
| **Phi-4-mini (3.8B)** | ~2,3 GB | ~3,5 GB | Multilingüe aceptable | Desktop-only; es el modelo de Edge |
| **Salamandra 2B instruct (BSC)** | sin build WebLLM/ONNX | — | Español/catalán/euskera/gallego por diseño, Apache 2.0 | Solo GGUF/GPTQ para vLLM; no hay conversión web publicada. Habría que compilarlo con MLC o exportar a ONNX a mano. En La Leaderboard (2026-05) 24,4% en ES; no brilla |
| **Gemma 4 E2B (LiteRT-LM web)** | 2.004 MB | 1,5 GB CPU + 1,8 GB GPU | Multilingüe | 73,9 tok/s en M4 Max; *early preview*, desktop |

Fuentes de tamaños: [Pinggy 2026](https://pinggy.io/blog/run_llm_in_browser_webgpu/), [gemma-webgpu](https://github.com/svenflow/webgpu-gemma), [localmode.dev — comparativa de providers](https://localmode.dev/blog/three-llm-providers-one-api), [LiteRT-LM Web API](https://developers.google.com/edge/litert-lm/js), [Salamandra 2B](https://huggingface.co/BSC-LT/salamandra-2b).

### Velocidad medida (tokens/segundo)

| Dispositivo | Modelo / motor | tok/s | Fuente |
|---|---|---|---|
| MacBook M3 Max, Chrome | Phi 3.5 mini / WebLLM | 71 | paper WebLLM |
| MacBook M3 Pro, Chrome 153 | Llama 3.2 1B / WebLLM | 27-67 (variable) | Pinggy |
| Mac Mini M4 Pro, Chrome | Gemma 3 1B Q8 / gemma-webgpu | 59,8 | gemma-webgpu |
| Mac Mini M4 Pro, Chrome | Gemma 3 1B q4 / Transformers.js | **crash** (abort ONNX WebGPU) | gemma-webgpu |
| M2 MacBook Air | Qwen2.5 0.5B / Transformers.js | ~42 (no verificado) | blog terceros |
| **iPhone 17 Pro Max, Safari iOS 26** | Gemma 3 1B Q8 | 34,4 (TTFT 0,45 s) | gemma-webgpu |
| **iPhone 17 Pro Max, Safari iOS 26** | Gemma 3 270M Q8 | 101 | gemma-webgpu |
| **iPhone 11 Pro Max** | Llama 3.2 1B, Qwen2.5 1.5B, Qwen2.5 0.5B (WebLLM, Transformers.js, wllama) | **ninguno terminó**: recarga silenciosa de la página por memoria | prueba HN 2026 |
| Pixel 8a (8 GB) en navegador in-app LINE | Llama 3.2 1B / WebLLM | descarga colgada; en Chrome terminó | misma prueba |
| Teléfonos "cluster bajo" (Adreno, Mali, PowerVR, iPhone 15) | modelos más chicos (gemma3, qwen3, lfm) / LlamaWeb | **4-17 tok/s**; Mali/PowerVR crashean con KV-cache 2048 | paper "Llamas on the Web" (2026) |
| Galaxy S24 (Xclipse) | ídem | cluster medio | ídem |

Fuentes: [gemma-webgpu](https://github.com/svenflow/webgpu-gemma), [Llamas on the Web, arXiv 2605.20706](https://www.alphaxiv.org/abs/2605.20706.md), [Pinggy](https://pinggy.io/blog/run_llm_in_browser_webgpu/), [write-up HN "WebGPU feature detection was not enough to run small LLMs on phones"](https://hackernews-dynamic.seasondane.workers.dev/news/48624985).

Lectura para tu caso: 250 palabras en español son ~400-450 tokens. A 10 tok/s (gama media con suerte) son **40-45 segundos** de generación, más la carga; a 34 tok/s (iPhone 17 Pro) son ~13 s. Haiku 5.5 lo devuelve en 2-4 s.

### Límites de memoria en celulares (el verdadero bloqueante)
- **iOS Safari:** el paper LlamaWeb mide que **la memoria por pestaña está limitada a menos de 500 MB**, y WebKit cuenta la memoria de GPU contra la pestaña. Cuando se pasa, iOS mata la página y Safari la recarga **sin error capturable** (tu `try/catch` nunca se entera). Solo modelos ≤300 MB tienen chance en iPhones no-Pro.
- **Android:** depende del SoC. Adreno/Mali de gama media entran en el "cluster bajo"; algunos Mali y PowerVR directamente crashean. Los navegadores in-app (Instagram, WhatsApp, Facebook — muy comunes como punto de entrada en Argentina) usan WebView, donde WebGPU suele no estar expuesto o la descarga se cuelga.
- **RAM 2026:** por la escasez de DRAM, la gama de entrada y media que se vende en 2026 trae *menos* RAM que en 2025 (vuelven los 4 GB) ([MuyComputer, dic-2025](https://www.muycomputer.com/2025/12/15/smartphones-con-menos-memoria-y-precios-mas-altos-volveran-los-4-gb-de-ram/)). Un equipo con 4 GB tiene ~1-1,5 GB libres para una pestaña; un modelo de 1B no entra.
- `navigator.gpu` existiendo **no alcanza** como detección: el write-up de HN muestra adaptadores que reportan `maxBufferSize` 4 GB y aun así fallan.

### Primera carga y cacheo
- **Descarga fría:** Llama 3.2 1B (695 MB, 22 shards) tardó **3-5 minutos** en una buena conexión de escritorio (Pinggy). En 4G argentino con plan limitado, 500 MB-1 GB es una fracción grande del plan mensual y la descarga puede cortarse.
- **Recarga cacheada:** 1,4 s (dominada por compilación de shaders).
- **Dónde se guarda:** WebLLM usa **Cache API por defecto**, opcional `cacheBackend: "indexeddb"` o `"cross-origin"` (experimental, comparte pesos entre sitios con una extensión) ([docs WebLLM](https://webllm.mlc.ai/docs/user/advanced_usage.html)). LlamaWeb usa **OPFS** con streaming a GPU en buffers de 1 MB y 29-33% menos pico de memoria que WebLLM/Transformers.js. gemma-webgpu hace streaming por capas vía HTTP Range (pico JS ~50 MB).
- **Evicción:** Safari borra el storage de un origen tras 7 días sin interacción (ITP); Chrome evicta por presión de disco. Hay que asumir que la descarga puede repetirse.
- **Web Worker:** WebLLM tiene `CreateWebWorkerMLCEngine` (misma API) y `ServiceWorkerMLCEngine` con heartbeat; Transformers.js corre en worker sin ayuda especial. Imprescindible para no congelar la UI.

### Transformers.js v4 (feb-2026)
- Runtime WebGPU reescrito en C++, soporta >8B parámetros, `dtype: "q4f16"` ([blog HF](https://huggingface.co/blog/transformersjs-v4), [Qwen3-0.6B-ONNX](https://huggingface.co/onnx-community/Qwen3-0.6B-ONNX)). Tiene fallback WASM (CPU), que en celular da 5-15 tok/s y suele morir por memoria antes.
- Rendimiento típico 40-60 tok/s en WebGPU desktop, por debajo de WebLLM (60-100). En la prueba de gemma-webgpu, Gemma 3 1B q4 en Transformers.js **crasheó** en un M4 Pro — el runtime ONNX WebGPU todavía tiene bordes filosos con decoders.
- Ventaja real: mismo paquete para WebGPU y WASM, y catálogo ONNX más amplio. Desventaja: mayor consumo de memoria que LlamaWeb y menos estable que WebLLM para generación.

### Calidad en español para redactar
- No existe un benchmark público de "redacción en español" para modelos <1B. Lo que hay: comprensión (Belebele, Global MMLU), donde Qwen3 0.6B anda en ~27 puntos de media multilingüe vs 58 de Gemma 27B ([Qwen3 Technical Report](https://arxiv.org/pdf/2505.09388)); Gemma 3 1B 49,3 en ES; Qwen3 1.7B 53,2 en ES (leaderboard de terceros, metodología opaca).
- Para 150-250 palabras siguiendo hechos dados, un 1B produce español gramatical pero genérico, con tendencia a repetir y a mezclar cartas cuando la tirada tiene más de 3 posiciones. Un 270M/360M no es confiable para seguir instrucciones (IFEval 51). **Rioplatense (voseo, "che", tono cálido) no lo da ninguno de fábrica**; se logra parcialmente con few-shot en el prompt, a costa de más tokens de prefill en un dispositivo lento.

## 3. Apple Foundation Models / Safari

- **No hay API web.** El framework Foundation Models (WWDC25, ampliado en WWDC26 con un SDK de Python) es Swift nativo. Un ingeniero de Apple DevRel en los foros (junio 2026): *"the framework doesn't provide any JavaScript interface"*; la ruta sugerida es un message handler de WKWebView dentro de una app nativa. Fuentes: [foundation-models-web-bridge](https://github.com/peterlyeung/foundation-models-web-bridge), [freeCodeCamp](https://www.freecodecamp.org/news/how-to-use-apple-s-foundation-models-in-a-web-app-with-a-macos-companion/), [WWDC26 macOS guide](https://developer.apple.com/wwdc26/guides/macos/).
- Safari 26/27 (WebKit) no anuncia nada parecido a Prompt API; WebKit figura como "no signal" en el Intent to Ship de Chrome.
- Única vía: envolver la web en una app iOS (Capacitor/Expo) y puentear el modelo nativo. Fuera de alcance para una web Next.js.

## 4. Patrones de producto

### Progressive enhancement (reglas siempre, IA cuando se puede)
Orden de cascada que usan apps reales y recomienda localmode.dev:

1. **Texto por reglas/plantillas**: se renderiza siempre, de inmediato, en SSR. Es el contenido canónico y el que se guarda.
2. **Chrome Prompt API** si `('LanguageModel' in self)` y `availability({expectedOutputs:[{type:'text', languages:['es']}]})` devuelve `available`. Sin descarga a cargo del sitio. Solo desktop.
3. **(Opcional, desktop)** WebLLM con Gemma 3 1B o Qwen3 1.7B, **opt-in explícito**: el botón dice "Mejorar la lectura con IA local (descarga 560 MB una sola vez)". Gate previo: `navigator.gpu`, `navigator.deviceMemory >= 8`, `!navigator.connection?.saveData`, `navigator.storage.estimate()` con ≥2 GB libres, y pedir `navigator.storage.persist()`. Nunca en mobile (user-agent/`pointer: coarse` + `deviceMemory < 8`).
4. **Servidor (Haiku 5.5)** como alternativa si querés calidad para todos.

### Mecánica
- Correr el motor en **Web Worker** (WebLLM `CreateWebWorkerMLCEngine`); mostrar progreso con `initProgressCallback`.
- **Streaming** (`stream: true`) para que el usuario vea texto a los 1-2 s, encima del texto por reglas, no reemplazándolo hasta terminar.
- **Timeouts:** abortar generación a los 20-25 s (`AbortController`); si no terminó, se queda el texto de reglas. Timeout de carga a 90 s en desktop.
- **Reintentos:** máximo uno; después, desactivar la IA en ese dispositivo (`localStorage`) para no volver a pagar la descarga.
- **Errores no capturables:** en iOS Safari la página se recarga sola por memoria. Guardar un flag `ia_intento=1` en `sessionStorage` antes de cargar; si al volver existe, no reintentar y marcar el dispositivo como no apto.

### Verificar que el modelo no inventa cartas (reglas sobre la salida)
1. **Lista cerrada de entidades:** desde el prompt se conoce el conjunto `{cartas, posiciones}`. Sobre la salida: extraer con regex/normalización (sin tildes, minúsculas) todas las menciones de nombres de los 78 arcanos y de palos/números; **rechazar si aparece una carta que no está en la tirada**, o si falta alguna carta que sí está.
2. **Dignidad y orientación:** si la tirada dice "invertida", la salida no puede decir "derecha" para esa carta y viceversa; chequear por co-ocurrencia en la misma oración.
3. **Longitud y forma:** 150-250 palabras, un solo párrafo (o los que pidas), sin listas, sin markdown, sin "Como IA…".
4. **Salida estructurada:** pedir JSON `{ "parrafo": string, "cartas_mencionadas": string[] }`. WebLLM soporta `response_format` con esquema JSON (gramática vía XGrammar) y Chrome Prompt API tiene *structured output* en la spec (Edge colaboró en eso). Esto facilita la validación pero **no evita** la alucinación semántica, por eso el chequeo 1-2 va igual.
5. **Si falla cualquier check → se muestra el texto por reglas.** El texto de IA nunca es la única copia.
6. Medir: loguear `{dispositivo, modelo, tiempo_carga, tok/s, pasó_validación}` para decidir con datos si mantener la rama.

## 5. Costo comparado con servidor (Claude Haiku 5.5)

Precio vigente (Anthropic, prompts ≤100K tokens): **USD 0,10 / millón de tokens de entrada, USD 0,50 / millón de salida**; batch a mitad de precio; cache reads USD 0,01/M ([VKTR](https://www.vktr.com/ai-platforms/anthropic-cuts-smallmodel-pricing-90-with-claude-haiku-55/), [eesel.ai](https://www.eesel.ai/blog/claude-haiku-5-5-pricing), [apidog](https://apidog.com/blog/claude-haiku-5-5-pricing/); confirmado con la tabla de modelos del skill `claude-api` cacheada 2026-10-06). Nota: el tokenizador de Haiku 5.5 produce ~30% más tokens que Haiku 4.5 para el mismo texto; lo incluyo en el cálculo pesimista.

| Escenario | Entrada | Salida | Costo por tirada | 1.000 tiradas | 10.000 | 100.000 | 1.000.000 |
|---|---|---|---|---|---|---|---|
| Nominal (800 in / 300 out) | 0,00008 | 0,00015 | **USD 0,00023** | 0,23 | 2,30 | 23 | 230 |
| Pesimista (+30% tokens) | 0,000104 | 0,000195 | **USD 0,00030** | 0,30 | 3,00 | 30 | 300 |
| Pesimista con Batch API (-50%) | | | USD 0,00015 | 0,15 | 1,50 | 15 | 150 |

En pesos, con el dólar actual, una tirada cuesta **menos de medio centavo**. Para que el servidor cueste USD 100/mes hacen falta ~330.000 tiradas mensuales. Comparado con eso, la rama de IA en navegador implica: ~1-2 semanas de desarrollo + QA en dispositivos reales, 300 MB-1 GB de descarga por usuario (que en Argentina es un costo real trasladado al usuario), latencia de 15-60 s en celular, y una tasa de fallo alta e invisible en iOS. **"Gratis en el navegador" no es gratis: es más caro para el usuario y para el equipo.**

Bonus: el prompt estructurado que ya tenés es ideal para `output_config.format` (salida JSON validada) y para la verificación por reglas del punto 4, en servidor igual que en cliente.

## 6. Recomendación

**(c) Híbrido — pero con la capa de IA en navegador limitada a Chrome Prompt API en desktop, no a WebLLM, y con Haiku 5.5 como la verdadera capa de calidad.**

Justificación con números:

1. **El público no puede correr WebLLM.** 87% Android ([StatCounter sep-2026](https://gs.statcounter.com/os-market-share/mobile/argentina)), gama media con 4-8 GB de RAM y GPUs Adreno/Mali de "cluster bajo" a 4-17 tok/s; iOS Safari con <500 MB por pestaña y recargas silenciosas. Un párrafo de 450 tokens tarda 30-60 s después de una descarga de 300-700 MB. Para el 12% de iPhone, solo los Pro de 2025+ lo logran (34 tok/s con Gemma 1B).
2. **Las reglas + plantillas resuelven el 100% de los casos en 0 ms**, se renderizan en servidor y son verificables. Con tu prompt ya estructurado (hechos + hilo narrativo), un motor de plantillas con variación (sinónimos, conectores, 3-4 plantillas por posición, voseo fijo) da un resultado consistente y "de la casa", que además es lo que el tarot tradicional espera.
3. **Chrome Prompt API es la única mejora progresiva que no cuesta descarga al sitio ni al usuario** y que soporta `es` oficialmente. Cubre Chrome 148+ desktop con GPU >4 GB VRAM o 16 GB RAM. Implementarla son ~100 líneas: `availability()`, `create({expectedOutputs:[{type:'text',languages:['es']}]})`, `promptStreaming()`, validación por reglas, fallback. Si en 2027 Google lo lleva a Android vía AICore, la misma rama se enciende sola.
4. **Haiku 5.5 cuesta USD 0,0003 por tirada.** Si en algún momento querés que *todos* tengan una síntesis generada (y no solo los de Chrome desktop), un Server Action con Haiku 5.5, `output_config.format` JSON y la misma validación por reglas cuesta USD 3 cada 10.000 tiradas. Eso es más barato que el ancho de banda de servir un modelo de 500 MB a 100 usuarios. Si querés cero costo variable, cortás ahí y te quedás con reglas + Prompt API.
5. **WebLLM/Transformers.js solo si** aparece un requisito de privacidad total u offline que justifique la complejidad; en ese caso Gemma 3 1B (563 MB, 711 MB VRAM) en WebLLM, opt-in, desktop-only, con gate por `deviceMemory`, `saveData` y `storage.estimate()`.

### Orden de implementación sugerido
1. Reglas + plantillas (SSR, sin JS). Es el producto.
2. Validador de salida por reglas (lista cerrada de cartas, orientación, longitud) — sirve para cualquier modelo después.
3. Prompt API en Chrome desktop como *enhancement* con streaming sobre el texto de reglas, timeout 20 s.
4. (Opcional) Server Action con Haiku 5.5 detrás de un flag, cuando haya presupuesto de USD 5/mes.

---

### Fuentes principales
- Chrome Prompt API (docs oficiales, 2026-10-21): https://developer.chrome.com/docs/ai/prompt-api
- Intent to Ship Prompt API, blink-dev (abril 2026): https://groups.google.com/a/chromium.org/g/blink-dev/c/iR6R7-nQeHI
- Gemini Nano en Chrome 148: https://pasqualepillitteri.it/en/news/3145/gemini-nano-chrome-built-in-ai-client-side-en
- Edge Prompt API (Phi-4-mini / Aion): https://learn.microsoft.com/en-us/microsoft-edge/web-platform/prompt-api
- WebKit — Safari 26.0 (WebGPU en iOS): https://webkit.org/blog/17333/webkit-features-in-safari-26-0/
- Llamas on the Web (LlamaWeb, mayo 2026): https://www.alphaxiv.org/abs/2605.20706.md
- gemma-webgpu (benchmarks iPhone 17 Pro Max / M4 Pro): https://github.com/svenflow/webgpu-gemma
- Pinggy — LLM en el navegador 2026 (tabla de modelos, soporte WebGPU): https://pinggy.io/blog/run_llm_in_browser_webgpu/
- localmode.dev — WebLLM vs Transformers.js v4 vs wllama vs LiteRT-LM vs Chrome AI: https://localmode.dev/blog/three-llm-providers-one-api
- WebLLM 0.2.83 hands-on Qwen3: https://dev.to/creeta/qwen3-in-the-browser-zero-keys-webllm-0283-hands-on-3ai2
- WebLLM docs (workers, cache backends): https://webllm.mlc.ai/docs/user/advanced_usage.html
- Transformers.js v4: https://huggingface.co/blog/transformersjs-v4 · Qwen3-0.6B-ONNX: https://huggingface.co/onnx-community/Qwen3-0.6B-ONNX
- Prueba en teléfonos (iPhone 11 Pro Max, Pixel 8a): https://hackernews-dynamic.seasondane.workers.dev/news/48624985
- Gemma 3 270M model card: https://huggingface.co/google/gemma-3-270m · SmolLM3-3B: https://huggingface.co/HuggingFaceTB/SmolLM3-3B
- Qwen3 Technical Report: https://arxiv.org/pdf/2505.09388
- Salamandra 2B (BSC): https://huggingface.co/BSC-LT/salamandra-2b · leaderboard: https://benchmarklist.com/models/bsc-lt-salamandra-2b-instruct/
- LiteRT-LM Web API (Gemma 4): https://developers.google.com/edge/litert-lm/js
- Apple Foundation Models sin API web: https://github.com/peterlyeung/foundation-models-web-bridge · https://developer.apple.com/wwdc26/guides/macos/
- StatCounter Argentina móvil (sep-2026): https://gs.statcounter.com/os-market-share/mobile/argentina
- RAM en gama media 2026: https://www.muycomputer.com/2025/12/15/smartphones-con-menos-memoria-y-precios-mas-altos-volveran-los-4-gb-de-ram/
- Precio Haiku 5.5: https://www.vktr.com/ai-platforms/anthropic-cuts-smallmodel-pricing-90-with-claude-haiku-55/ · https://www.eesel.ai/blog/claude-haiku-5-5-pricing · https://apidog.com/blog/claude-haiku-5-5-pricing/
