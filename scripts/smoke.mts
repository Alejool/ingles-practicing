/**
 * Prueba de humo de todo el stack: front, API, base de datos, correo e IA.
 *
 *   bash start.sh test              (lo lanza dentro del contenedor)
 *   node scripts/smoke.mts          (contra http://localhost:8080)
 *
 * Variables:
 *   BASE            URL de la app        (por defecto http://127.0.0.1:8080)
 *   MAILPIT         URL de Mailpit       (por defecto http://mailpit:8025, luego localhost)
 *   ADMIN_TOKEN     para las pruebas de administración
 *   SMOKE_SKIP_AI=1 no gasta llamadas reales a DeepSeek
 *
 * Las cuentas que crea terminan en @smoke.test y se borran al final.
 */

const BASE = (process.env.BASE || "http://127.0.0.1:8080").replace(/\/+$/, "");
const MAILPITS = [process.env.MAILPIT, "http://mailpit:8025", "http://127.0.0.1:8025"].filter(Boolean) as string[];
const ADMIN = process.env.ADMIN_TOKEN || "";
const SKIP_AI = process.env.SMOKE_SKIP_AI === "1";

const DEVICE = "smoke-" + Math.random().toString(36).slice(2, 12);
const EMAIL = `prueba-${Date.now()}@smoke.test`;

let passed = 0;
let failed = 0;
let skipped = 0;
const problems: string[] = [];

const C = (process.stdout.isTTY || process.env.FORCE_COLOR === "1")
  ? { g: "\x1b[32m", r: "\x1b[31m", y: "\x1b[33m", d: "\x1b[2m", b: "\x1b[1m", n: "\x1b[0m" }
  : { g: "", r: "", y: "", d: "", b: "", n: "" };

function section(name: string) {
  console.log(`\n${C.b}${name}${C.n}`);
}

async function check(name: string, fn: () => Promise<string | void>): Promise<void> {
  try {
    const detail = await fn();
    passed++;
    console.log(`  ${C.g}✓${C.n} ${name}${detail ? `  ${C.d}${detail}${C.n}` : ""}`);
  } catch (e: any) {
    failed++;
    problems.push(`${name}: ${e?.message || e}`);
    console.log(`  ${C.r}✗${C.n} ${name}\n      ${C.r}${e?.message || e}${C.n}`);
  }
}

function skip(name: string, why: string): void {
  skipped++;
  console.log(`  ${C.y}–${C.n} ${name}  ${C.d}${why}${C.n}`);
}

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

function headers(token?: string): Record<string, string> {
  const h: Record<string, string> = { "X-Device-Id": DEVICE, "Content-Type": "application/json" };
  if (token) h.Authorization = "Bearer " + token;
  return h;
}

async function api(path: string, init: RequestInit = {}): Promise<{ status: number; body: any; res: Response }> {
  const res = await fetch(BASE + path, { redirect: "manual", ...init });
  const text = await res.text();
  let body: any = text;
  try { body = text ? JSON.parse(text) : null; } catch { /* no es JSON */ }
  return { status: res.status, body, res };
}

/** Pide una corrección y devuelve el texto que llega por streaming. */
async function correct(payloadKind: string, payload: unknown, token?: string): Promise<{ status: number; text: string; error: any }> {
  const res = await fetch(BASE + "/api/ai/chat", {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify({ kind: payloadKind, payload }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    return { status: res.status, text: "", error: body?.error ?? null };
  }
  const reader = res.body!.getReader();
  const dec = new TextDecoder();
  let buf = "";
  let out = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i: number;
    while ((i = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, i).trim();
      buf = buf.slice(i + 1);
      if (!line.startsWith("data:")) continue;
      const p = line.slice(5).trim();
      if (p === "[DONE]") continue;
      try {
        const j = JSON.parse(p);
        const d = j.choices?.[0]?.delta?.content;
        if (d) out += d;
      } catch { /* fragmento parcial */ }
    }
  }
  return { status: 200, text: out, error: null };
}

async function mailpitLink(): Promise<string> {
  let lastErr = "";
  for (const base of MAILPITS) {
    try {
      const list = await fetch(base.replace(/\/+$/, "") + "/api/v1/messages?limit=20", { signal: AbortSignal.timeout(4000) });
      if (!list.ok) { lastErr = base + " → " + list.status; continue; }
      const data = await list.json();
      const msg = (data.messages || []).find((m: any) =>
        (m.To || []).some((t: any) => (t.Address || "").toLowerCase() === EMAIL));
      if (!msg) { lastErr = "el correo a " + EMAIL + " no ha llegado a " + base; continue; }
      const full = await (await fetch(base.replace(/\/+$/, "") + "/api/v1/message/" + msg.ID)).json();
      const body = ((full.Text || "") + " " + (full.HTML || "")).replace(/=\r?\n/g, "");
      // El "=" de token= puede venir como "=3D" si el cuerpo llega en quoted-printable.
      const link = body.match(/\/api\/auth\/verify\?token(?:=3D|=)([A-Za-z0-9_-]+)/);
      if (!link) { lastErr = "el correo no trae enlace"; continue; }
      // Se reconstruye sobre BASE: dentro del contenedor y desde el host la URL difiere.
      return `${BASE}/api/auth/verify?token=${link[1]}`;
    } catch (e: any) {
      lastErr = base + " → " + (e?.message || e);
    }
  }
  throw new Error("no pude leer el buzón (" + lastErr + ")");
}

async function main(): Promise<void> {
  console.log(`${C.b}Prueba de humo · Ruta B1 → B2${C.n}`);
  console.log(`${C.d}app ${BASE} · dispositivo ${DEVICE} · cuenta ${EMAIL}${C.n}`);

  let anonLimit = 0;
  let anonRemaining = 0;
  let usedBaseline = 0;
  let sessionToken = "";
  let loginLink = "";
  let aiWorks = false;

  /* ── 1. infraestructura ─────────────────────────────────────────── */
  section("1 · Infraestructura");

  await check("La app responde y la base de datos está viva", async () => {
    const { status, body } = await api("/healthz");
    assert(status === 200 && body?.ok === true, `healthz devolvió ${status} ${JSON.stringify(body)}`);
  });

  await check("El front se sirve completo", async () => {
    const res = await fetch(BASE + "/");
    const html = await res.text();
    assert(res.status === 200, "status " + res.status);
    // Se comprueban los extremos y los añadidos, no un número clavado: así
    // añadir un módulo no rompe la prueba, pero perder uno sí.
    ["panel", "plan", "vocab", "mine", "quiz", "input", "speak", "cuenta"].forEach(id =>
      assert(html.includes(`id="v-${id}"`), `falta el módulo ${id}`));
    const modules = (html.match(/<section class="view[^"]*" id="v-/g) || []).length;
    assert(modules >= 16, `esperaba al menos 16 módulos y hay ${modules}`);
    assert(html.includes('id="boot"'), "falta el cartel de arranque");
    return `${modules} módulos · ${(html.length / 1024).toFixed(0)} KB`;
  });

  await check("Los estáticos y el manifest se sirven", async () => {
    const man = await fetch(BASE + "/manifest.webmanifest");
    assert(man.ok, "manifest " + man.status);
    const sw = await fetch(BASE + "/sw.js");
    assert(sw.ok, "sw.js " + sw.status);
    const swText = await sw.text();
    assert(swText.includes('startsWith("/api/")'), "el service worker no excluye /api/ de la caché");
    return "manifest, sw.js y exclusión de /api/ correctos";
  });

  await check("No hay ninguna clave en el bundle del navegador", async () => {
    const html = await (await fetch(BASE + "/")).text();
    const scripts = [...html.matchAll(/src="([^"]+\.js)"/g)].map(m => m[1]);
    assert(scripts.length > 0, "no encontré el bundle");
    for (const s of scripts) {
      const code = await (await fetch(BASE + (s.startsWith("/") ? s : "/" + s))).text();
      assert(!/sk-[A-Za-z0-9]{16,}/.test(code), `¡hay una clave en ${s}!`);
      assert(!/DEEPSEEK_API_KEY|DATABASE_URL|ADMIN_TOKEN/.test(code), `¡hay una variable de servidor en ${s}!`);
    }
    return `${scripts.length} bundle(s) limpios`;
  });

  await check("Un endpoint inexistente devuelve 404 JSON", async () => {
    const { status, body } = await api("/api/no-existe");
    assert(status === 404 && body?.error?.code === "not_found", `${status} ${JSON.stringify(body)}`);
  });

  /* ── 2. cuota anónima ───────────────────────────────────────────── */
  section("2 · Cuota sin cuenta");

  await check("La cuota anónima se lee", async () => {
    const { status, body } = await api("/api/quota", { headers: headers() });
    assert(status === 200, "status " + status);
    assert(body?.quota?.authenticated === false, "debería ser anónima");
    anonLimit = body.quota.limit;
    anonRemaining = body.quota.remaining;
    usedBaseline = body.quota.used;
    assert(anonLimit > 0, "el límite anónimo es 0");
    return `${body.quota.remaining} de ${anonLimit} · global ${body.quota.globalRemaining}`;
  });

  await check("Una petición malformada se rechaza", async () => {
    const { status, body } = await api("/api/ai/chat", { method: "POST", headers: headers(), body: JSON.stringify({ kind: "cualquiera", payload: {} }) });
    assert(status === 422 && body?.error?.code === "bad_kind", `${status} ${JSON.stringify(body?.error)}`);
  });

  await check("Un texto vacío se rechaza antes de gastar cuota", async () => {
    const { status, body } = await api("/api/ai/chat", { method: "POST", headers: headers(), body: JSON.stringify({ kind: "error", payload: { category: "g", text: "" } }) });
    assert(status === 422 && body?.error?.code === "bad_payload", `${status} ${JSON.stringify(body?.error)}`);
    const q = await api("/api/quota", { headers: headers() });
    assert(q.body.quota.used === usedBaseline, "una petición inválida ha gastado cuota");
  });

  const anonAgotado = anonRemaining <= 0;
  if (SKIP_AI) {
    skip("Corrección real con DeepSeek", "SMOKE_SKIP_AI=1");
    skip("Agotar el cupo anónimo", "SMOKE_SKIP_AI=1");
  } else if (anonAgotado) {
    // La cuota anónima va por dispositivo Y por IP: si ya se usó desde este equipo,
    // no hay cupo que gastar. La IA se prueba más abajo, con sesión.
    skip("Corrección real sin cuenta", "esta IP ya agotó el cupo anónimo");
    skip("El cupo anónimo se agota", `ya estaba agotado (${usedBaseline}/${anonLimit})`);
    await check("Sin cupo, la respuesta invita a entrar con el correo", async () => {
      const r = await correct("error", { category: "gramática", text: "I have 32 years old." });
      assert(r.status === 402 && r.error?.code === "anon_limit", `${r.status} ${JSON.stringify(r.error)}`);
      assert(/correo/i.test(r.error?.message || ""), "el mensaje no invita a entrar");
      return `"${r.error.message.slice(0, 60)}…"`;
    });
  } else {
    await check("Una corrección real devuelve texto por streaming", async () => {
      const r = await correct("error", { category: "gramática", text: "I have 32 years old and I working here since 2019." });
      if (r.status === 502 && r.error?.code === "provider_no_credit") throw new Error("la cuenta de DeepSeek no tiene saldo");
      if (r.status === 502) throw new Error("DeepSeek no responde: " + (r.error?.message || ""));
      assert(r.status === 200, `status ${r.status} ${JSON.stringify(r.error)}`);
      assert(r.text.length > 40, "la respuesta llegó vacía o cortada");
      aiWorks = true;
      return `${r.text.length} caracteres · empieza por "${r.text.slice(0, 40).replace(/\n/g, " ")}…"`;
    });

    await check("El cupo anónimo se agota y lo dice claro", async () => {
      let last: Awaited<ReturnType<typeof correct>> | null = null;
      for (let i = 0; i < anonRemaining + 2; i++) {
        last = await correct("error", { category: "gramática", text: `Prueba número ${i}: I have 32 years old.` });
        if (last.status !== 200) break;
      }
      assert(last, "sin resultado");
      if (last!.status === 429 && last!.error?.code === "too_fast") {
        return "se cortó antes por el límite de ritmo (también correcto)";
      }
      assert(last!.status === 402, `esperaba 402 y llegó ${last!.status}`);
      assert(last!.error?.code === "anon_limit", `código ${last!.error?.code}`);
      assert(/correo/i.test(last!.error?.message || ""), "el mensaje no invita a entrar con el correo");
      return `bloqueado tras ${anonLimit}: "${last!.error.message.slice(0, 60)}…"`;
    });
  }

  /* ── 3. entrar por correo ───────────────────────────────────────── */
  section("3 · Entrar con el enlace mágico");

  await check("Un correo inválido se rechaza", async () => {
    const { status, body } = await api("/api/auth/request", { method: "POST", headers: headers(), body: JSON.stringify({ email: "esto-no-es-un-correo" }) });
    assert(status === 422 && body?.error?.code === "bad_email", `${status} ${JSON.stringify(body?.error)}`);
  });

  await check("Se pide el enlace", async () => {
    const { status, body } = await api("/api/auth/request", { method: "POST", headers: headers(), body: JSON.stringify({ email: EMAIL }) });
    assert(status === 200 && body?.ok, `${status} ${JSON.stringify(body)}`);
    return `caduca en ${body.minutes} minutos`;
  });

  await check("El correo llega al buzón con su enlace", async () => {
    await new Promise(r => setTimeout(r, 1200));
    loginLink = await mailpitLink();
    return loginLink.replace(/token=.*/, "token=…");
  });

  await check("El enlace crea la sesión", async () => {
    assert(loginLink, "no hay enlace");
    const res = await fetch(loginLink, { redirect: "manual" });
    assert(res.status === 302, "esperaba una redirección y llegó " + res.status);
    const loc = res.headers.get("location") || "";
    const m = loc.match(/#auth=(.+)$/);
    assert(m, "la redirección no trae el token: " + loc);
    assert(m![1] !== "expired" && m![1] !== "error", "la redirección dice " + m![1]);
    sessionToken = decodeURIComponent(m![1]);
    return "token de sesión recibido";
  });

  await check("El mismo enlace no vale dos veces", async () => {
    const res = await fetch(loginLink, { redirect: "manual" });
    const loc = res.headers.get("location") || "";
    assert(/#auth=expired/.test(loc), "el enlace se ha podido reutilizar: " + loc);
  });

  await check("La sesión identifica a la cuenta y sube la cuota", async () => {
    const { status, body } = await api("/api/auth/session", { headers: headers(sessionToken) });
    assert(status === 200, "status " + status);
    assert(body?.user?.email === EMAIL, "usuario " + JSON.stringify(body?.user));
    assert(body?.quota?.authenticated === true, "la cuota sigue siendo anónima");
    assert(body.quota.limit > anonLimit, `la cuota con cuenta (${body.quota.limit}) no supera la anónima (${anonLimit})`);
    return `${body.quota.limit}/día · ${body.quota.monthlyLimit}/mes`;
  });

  await check("Un token inventado no abre nada", async () => {
    const { status } = await api("/api/progress", { headers: headers("token-falso-12345") });
    assert(status === 401, "esperaba 401 y llegó " + status);
  });

  if (!SKIP_AI) {
    await check("Con sesión, las correcciones vuelven a funcionar", async () => {
      const r = await correct("writing", {
        task: "Email informal", level: "B1", words: "100",
        brief: "Write an email to your friend Sam about a job offer.",
        answer: "Hi Sam, I have 32 years old and I think you should take the job because is a good opportunity.",
      }, sessionToken);
      if (r.status === 502 && r.error?.code === "provider_no_credit") throw new Error("la cuenta de DeepSeek no tiene saldo");
      assert(r.status === 200, `status ${r.status} ${JSON.stringify(r.error)}`);
      assert(r.text.length > 40, "respuesta vacía");
      aiWorks = true;
      return `${r.text.length} caracteres`;
    });
  } else {
    skip("Corrección con sesión", "SMOKE_SKIP_AI=1");
  }

  /* ── 4. progreso ────────────────────────────────────────────────── */
  section("4 · Progreso sincronizado");

  let version = 0;

  await check("Se sube el progreso", async () => {
    const { status, body } = await api("/api/progress", {
      method: "PUT", headers: headers(sessionToken),
      body: JSON.stringify({ data: { tasks: { "1-0": true, "1-1": true } }, version: 0 }),
    });
    assert(status === 200, `${status} ${JSON.stringify(body)}`);
    version = body.version;
    return "versión " + version;
  });

  await check("Se recupera igual", async () => {
    const { status, body } = await api("/api/progress", { headers: headers(sessionToken) });
    assert(status === 200 && body?.data?.tasks?.["1-0"] === true, JSON.stringify(body));
    assert(body.version === version, `versión ${body.version} ≠ ${version}`);
  });

  await check("Una versión vieja da conflicto, no pisa lo nuevo", async () => {
    const { status, body } = await api("/api/progress", {
      method: "PUT", headers: headers(sessionToken),
      body: JSON.stringify({ data: { tasks: { "9-9": true } }, version: 0 }),
    });
    assert(status === 409 && body?.error?.code === "version_conflict", `${status} ${JSON.stringify(body?.error)}`);
    assert(body.error.server?.data?.tasks?.["1-0"] === true, "el conflicto no devuelve el estado del servidor");
    return "devuelve el estado del servidor para fundirlo";
  });

  await check("Con la versión correcta sí escribe", async () => {
    const { status, body } = await api("/api/progress", {
      method: "PUT", headers: headers(sessionToken),
      body: JSON.stringify({ data: { tasks: { "1-0": true, "2-0": true } }, version }),
    });
    assert(status === 200 && body.version === version + 1, `${status} ${JSON.stringify(body)}`);
  });

  await check("Sin sesión el progreso no se toca", async () => {
    const { status } = await api("/api/progress", { headers: headers() });
    assert(status === 401, "esperaba 401 y llegó " + status);
  });

  /* ── 5. latido anónimo ──────────────────────────────────────────── */
  section("5 · Latido anónimo");

  await check("El latido solo acepta POST", async () => {
    const { status, body } = await api("/api/pulse", { headers: headers() });
    assert(status === 405 && body?.error?.code === "method_not_allowed", `${status} ${JSON.stringify(body?.error)}`);
  });

  await check("Un latido se guarda", async () => {
    const { status, body } = await api("/api/pulse", {
      method: "POST", headers: headers(),
      body: JSON.stringify({ track: "b1b2", planDay: 12, doneDays: 9, streak: 4, seen: ["panel", "plan", "vocab"] }),
    });
    assert(status === 200 && body?.ok, `${status} ${JSON.stringify(body)}`);
  });

  await check("Repetirlo el mismo día no crea otra fila ni baja los números", async () => {
    const r = await api("/api/pulse", {
      method: "POST", headers: headers(),
      body: JSON.stringify({ track: "b1b2", planDay: 3, doneDays: 1, streak: 0, seen: ["panel"] }),
    });
    assert(r.status === 200, "status " + r.status);
    if (!ADMIN) return "sin ADMIN_TOKEN no puedo comprobar la fila";
    const { body } = await api(`/api/admin?token=${encodeURIComponent(ADMIN)}`);
    const p = body?.uso?.resumen;
    assert(p && p.personas >= 1, "el panel no ve ningún latido");
    return `${p.personas} persona(s) · día medio ${p.dia_medio}`;
  });

  await check("La basura del latido se descarta, no revienta", async () => {
    const { status } = await api("/api/pulse", {
      method: "POST", headers: headers(),
      body: JSON.stringify({ track: "<script>", planDay: 99999, doneDays: -5, streak: "x", seen: ["panel", "no-existe", 7] }),
    });
    assert(status === 200, "status " + status);
    return "se recorta a los rangos válidos";
  });

  await check("El latido no guarda nada que identifique", async () => {
    const src = await (await fetch(BASE + "/")).text();
    assert(!src.includes("|pulse|"), "la pimienta del latido no puede salir al navegador");
    if (!ADMIN) return "comprobado en el front";
    const { body } = await api(`/api/admin?token=${encodeURIComponent(ADMIN)}`);
    const j = JSON.stringify(body?.uso || {});
    assert(!j.includes("@"), "el panel de uso está devolviendo correos");
    return "ni correos ni ids en el panel de uso";
  });

  /* ── 6. administración ──────────────────────────────────────────── */
  section("6 · Administración");

  await check("Sin token no se entra", async () => {
    const { status } = await api("/api/admin?token=incorrecto");
    assert(status === 403, "esperaba 403 y llegó " + status);
  });

  if (ADMIN && aiWorks) {
    await check("El consumo queda apuntado con sus tokens", async () => {
      const { body } = await api(`/api/admin?token=${encodeURIComponent(ADMIN)}`);
      const hoy = (body.por_dia || [])[0];
      assert(hoy && hoy.llamadas > 0, "no hay llamadas registradas hoy");
      assert(hoy.tokens_entrada > 0 || hoy.tokens_salida > 0, "los tokens no se están contabilizando");
      return `${hoy.llamadas} llamadas · ${hoy.tokens_entrada + hoy.tokens_salida} tokens hoy`;
    });
  }

  if (ADMIN) {
    await check("Con token devuelve el consumo", async () => {
      const { status, body } = await api(`/api/admin?token=${encodeURIComponent(ADMIN)}`);
      assert(status === 200 && body?.totales, `${status} ${JSON.stringify(body).slice(0, 120)}`);
      return `${body.totales.usuarios} cuentas · ${body.totales.hoy} llamadas hoy · ${body.totales.tokens_mes} tokens este mes`;
    });
  } else {
    skip("Consumo con token", "no me pasaste ADMIN_TOKEN");
  }

  if (ADMIN) {
    await check("La biblioteca compartida se puede moderar desde el panel", async () => {
      const { body } = await api(`/api/admin?token=${encodeURIComponent(ADMIN)}`);
      const lista = body?.biblioteca || [];
      assert(Array.isArray(lista), "el panel no devuelve la biblioteca");
      if (!lista.length) return "todavía no hay textos publicados";
      const id = lista[0].id;
      const off = await api(`/api/admin?token=${encodeURIComponent(ADMIN)}&op=hide&id=${encodeURIComponent(id)}`, { method: "POST" });
      assert(off.status === 200 && off.body?.texto?.hidden === true, `ocultar: ${off.status} ${JSON.stringify(off.body)}`);
      const pub = await api(`/api/readings?track=${lista[0].track}`);
      assert(!JSON.stringify(pub.body).includes(`"id":"${id}"`), "el texto oculto sigue saliendo en público");
      const on = await api(`/api/admin?token=${encodeURIComponent(ADMIN)}&op=hide&id=${encodeURIComponent(id)}&show=1`, { method: "POST" });
      assert(on.status === 200 && on.body?.texto?.hidden === false, "no se pudo volver a mostrar");
      return `texto ${id} ocultado y restaurado`;
    });

    await check("Ocultar un id que no existe da 404", async () => {
      const { status, body } = await api(`/api/admin?token=${encodeURIComponent(ADMIN)}&op=hide&id=no-existe-99`, { method: "POST" });
      assert(status === 404 && body?.error?.code === "not_found", `${status} ${JSON.stringify(body?.error)}`);
    });
  } else {
    skip("Moderación de la biblioteca", "no me pasaste ADMIN_TOKEN");
  }

  /* ── 7. cerrar y limpiar ────────────────────────────────────────── */
  section("7 · Cierre y limpieza");

  await check("Cerrar sesión invalida el token", async () => {
    const { status } = await api("/api/auth/session", { method: "POST", headers: headers(sessionToken) });
    assert(status === 200, "logout devolvió " + status);
    const after = await api("/api/progress", { headers: headers(sessionToken) });
    assert(after.status === 401, "el token sigue valiendo tras cerrar sesión");
  });

  if (ADMIN) {
    await check("Se borran los datos de esta prueba", async () => {
      const { status, body } = await api(
        `/api/admin?token=${encodeURIComponent(ADMIN)}&op=cleanup-test&dev=${encodeURIComponent(DEVICE)}`,
        { method: "POST" });
      assert(status === 200 && body?.ok, `${status} ${JSON.stringify(body)}`);
      return `${body.borrados} cuenta(s) y ${body.pulsos ?? 0} latido(s) de prueba borrados`;
    });
  } else {
    skip("Limpieza", "sin ADMIN_TOKEN quedan las filas de prueba en la base");
  }

  /* ── resumen ────────────────────────────────────────────────────── */
  const total = passed + failed;
  console.log(`\n${C.b}Resultado${C.n}`);
  console.log(`  ${C.g}${passed} correctas${C.n}${failed ? `  ${C.r}${failed} fallidas${C.n}` : ""}${skipped ? `  ${C.y}${skipped} omitidas${C.n}` : ""}  ${C.d}de ${total} comprobaciones${C.n}`);
  if (failed) {
    console.log(`\n${C.r}Lo que falla:${C.n}`);
    problems.forEach(p => console.log("  · " + p));
    process.exit(1);
  }
  console.log(`\n${C.g}Todo en orden.${C.n}`);
}

main().catch(e => {
  console.error(`\n${C.r}La prueba se cortó:${C.n}`, e?.message || e);
  process.exit(1);
});
