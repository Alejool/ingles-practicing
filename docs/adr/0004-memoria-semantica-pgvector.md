# ADR 0004 — Memoria semántica del alumno: pgvector y embeddings locales

- Estado: propuesto (pendiente del punto de control 12.12 del dueño; la elección de modelo local + pgvector la decidió el dueño el 2026-11-05)
- Fecha: 2026-11-05
- Plan: `specs/harness-alumno/plan.md`, sección "(e) Memoria semántica"
- Spec: `specs/harness-alumno/spec.md`, AC-68 a AC-75

## Contexto

El harness (ADR 0002) decide el foco con PHP y deja que un modelo ligero redacte con un resumen de ≤ 600 tokens. Para que ese resumen sea pertinente, el agente tiene que encontrar por significado el contenido de la ruta que trabaja la duda ("me lío con el pasado y el present perfect") y recordar errores parecidos del propio estudiante ("esto ya te pasó hace tres semanas"). La búsqueda por palabra exacta falla con dudas en español sobre contenido en inglés y con formulaciones libres.

Restricciones: sin proveedor de pago nuevo (decisión del dueño); los textos del estudiante no salen del servidor para indexarse; latencia de búsqueda < 150 ms p95 (AC-70) sin llamadas al modelo de chat; datos de solo inserción (sin `UPDATE`, `DELETE` ni `DROP`), borrado solo en cascada con la cuenta; migraciones aditivas; producción en Neon y VPS con Docker, sin colas ni Redis (`QUEUE_CONNECTION=sync`).

## Opciones

1. **Embeddings de un proveedor de pago** (OpenAI, Voyage, Cohere, DeepSeek si lo ofreciera): mejor calidad de partida y nada que operar; pero añade proveedor y clave, coste por token, latencia de red (difícil de meter en 150 ms p95) y cada error o texto del estudiante sale a un tercero. Choca con la decisión del dueño.
2. **Solo texto completo de Postgres** (`tsvector`, sin vectores): cero piezas nuevas y rápido; no entiende sinónimos ni cruza idiomas (consulta en español, contenido en inglés), que es justo el caso principal. Se queda como **caída** (AC-72), no como solución.
3. **pgvector + modelo de embeddings local en un contenedor** (elegida): vectores en la misma base, sin servicio de búsqueda aparte; el modelo corre en el Docker del VPS.

Sub-decisiones:
- Modelo: `intfloat/multilingual-e5-small` (384 dim., ~118 M parámetros, MIT) frente a `paraphrase-multilingual-MiniLM-L12-v2` (mismo tamaño, peor recuperación), `multilingual-e5-base` (768 dim., ~2,5× RAM y latencia) y `bge-m3` (1 024 dim., ~2,2 GB).
- Servidor del modelo: Text Embeddings Inference (TEI) de Hugging Face frente a ONNX dentro de PHP (sin extensión mantenida en la imagen de fpm) o un servicio propio en Python (código que mantener).
- Índice: HNSW frente a IVFFlat (este necesita datos previos para entrenar las listas y reentrenar al crecer).
- Memoria del estudiante: guardar solo el vector y la referencia al evento frente a guardar también el texto.
- Indexado asíncrono: `afterResponse()` de Laravel con reintento en el siguiente lote frente a una cola con worker (no existe en el stack).

## Decisión

Opción 3.
- Base local: `pgvector/pgvector:0.8.6-pg17-bookworm` en lugar de `postgres:17-alpine`, sobre el mismo volumen (misma versión mayor y `--locale=C`). Producción: Neon con la extensión `vector` (≥ 0.8.0, comprobada antes de migrar).
- Modelo `intfloat/multilingual-e5-small` en la revisión `614241f622f53c4eeff9890bdc4f31cfecc418b3`, servido por `ghcr.io/huggingface/text-embeddings-inference:cpu-1.9.4` (`cpu-arm64-1.9.4` en ARM), sin puertos publicados, con `mem_limit` de 1,5 GB.
- Tablas nuevas de solo inserción: `content_chunks` (contenido público de la ruta, una vez por versión del contenido y modelo) y `learner_memories` (vector + `event_id`, `user_id` con borrado en cascada; sin texto: se recompone del evento al recuperar). Índices HNSW coseno (`m = 16`, `ef_construction = 64`) con `hnsw.iterative_scan` para el filtro por usuario; GIN de texto completo para la caída. Cuatro migraciones aditivas con `down()` vacío.
- Puertos `EmbeddingPort` (TEI / falso de test) y `VectorSearch` (pgvector / en memoria de test); `FullTextSearch` concreto como caída.
- La recuperación la hace PHP antes de llamar al modelo y entra en el resumen ya acotado (N = 5, dentro de `HARNESS_CONTEXT_TOKENS`): no hay herramienta nueva ni llamadas extra al modelo de chat.

## Consecuencias

- Positivas: dudas en español encuentran contenido en inglés; el tutor puede citar errores parecidos del propio estudiante; ningún texto sale del servidor para indexarse; sin coste por consulta; el modelo de coste del harness no cambia (el resumen tiene el mismo tope); todo se prueba sin red con adaptadores falsos y, en Docker, con el modelo real.
- Negativas: un contenedor más (~1 GB de RAM, ~470 MB de pesos que se descargan una vez); cambio de imagen de la base local; filas viejas de vectores que se acumulan al cambiar contenido o modelo (no se borran; volumen pequeño); cambiar a un modelo de otra dimensión exige una tabla o columna nueva.
- Riesgos: la latencia y la calidad son estimaciones hasta medirlas (tareas 12.10: si AC-70 falla, búsqueda exacta por usuario; si AC-68 falla, `multilingual-e5-base`); pgvector en Neon por debajo de 0.8 (sin búsqueda iterativa) — se comprueba antes de migrar; VPS ARM — imagen ARM de TEI.
- Reversible: `EMBEDDINGS_URL` vacío apaga los vectores y el harness sigue con texto completo (AC-72) sin tocar datos; las tablas se quedan (no se borran).
