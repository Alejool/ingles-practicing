/**
 * Arranque de la app.
 *
 * Importar cada vista registra sus listeners sobre el markup que Astro ya
 * renderizó en el build; después se pinta todo y se resuelve el módulo inicial
 * a partir del hash.
 */

import { S, save, resetState } from "./state";
import { $, el, toast } from "./dom";
import { MODULES, go, buildNav, buildTrackPicker, applyTheme, cycleTheme, setModuleRenderer, onTheme } from "./nav";
import { setTrackListener, setLoadingListener, asegurarRuta, asegurarLecturas, T } from "./track";
import { setStatsListener, marcarActividad, tickMinuto, currentDay, daysDone, streakLen } from "./progress";
import { latir } from "./pulse";
import { refreshAi } from "./ai";
import * as api from "./api";
import { startSync, pullAndMerge, setMergeListener, onSyncStatus } from "./sync";

import { renderPanel } from "./views/panel";
import "./views/exams";
import { renderDiag } from "./views/diagnostic";
import { renderPlan } from "./views/plan";
import { renderGram } from "./views/grammar";
import { renderVocab } from "./views/vocab";
import { renderMine } from "./views/mine";
import { renderUoe } from "./views/uoe";
import { renderWriting } from "./views/writing";
import { renderInput } from "./views/reading";
import { renderSpeak } from "./views/speaking";
import { renderQuiz } from "./views/quiz";
import { renderMockBlank } from "./views/mock";
import { renderErrors } from "./views/errors";
import { renderTutorModes } from "./views/tutor";
import { renderRes } from "./views/resources";
import { renderAjustes, setAfterImport, setSwReg, APP_VERSION } from "./views/settings";
import { renderAccount } from "./views/account";
import { haceFalta, montarOnboarding } from "./views/onboarding";

/** Qué función pinta cada módulo. La usa `go` para refrescar al entrar. */
const PINTA: Record<string, () => void> = {
  panel: renderPanel, diag: renderDiag, plan: renderPlan, gram: renderGram,
  vocab: renderVocab, mine: renderMine, uoe: renderUoe, writing: renderWriting,
  input: renderInput, speak: renderSpeak, quiz: renderQuiz, mock: renderMockBlank,
  errors: renderErrors, res: renderRes, ajustes: renderAjustes, cuenta: renderAccount,
};

export function renderAll(): void {
  const pasos: Array<[string, () => void]> = [
    ["panel", renderPanel], ["diagnóstico", renderDiag], ["plan", renderPlan],
    ["gramática", renderGram], ["vocabulario", renderVocab], ["mis palabras", renderMine],
    ["use of english", renderUoe], ["writing", renderWriting], ["listening & reading", renderInput],
    ["speaking", renderSpeak], ["prueba rápida", renderQuiz],
    ["simulacro", renderMockBlank], ["errores", renderErrors], ["recursos", renderRes],
    ["ajustes", renderAjustes], ["cuenta", renderAccount],
  ];
  // Si un módulo falla, los demás se pintan igual: nunca dejamos la app a medias.
  for (const [nombre, fn] of pasos) {
    try { fn(); } catch (e) { console.error("[render] falló el módulo", nombre, e); }
  }
}

/* Enlaces que romperían el grafo de imports si viviesen en sus módulos. */
setModuleRenderer(id => {
  // Salir de Vocabulario por el menú también cierra la tanda a pantalla completa.
  if (id !== "vocab") document.body.classList.remove("sesion-activa");
  PINTA[id]?.();
});
setStatsListener(renderPanel);
setAfterImport(renderAll);
setMergeListener(renderAll);

/* Cambiar de ruta repinta la app entera: el contenido sale todo de T(). */
setTrackListener(() => {
  buildTrackPicker();
  renderAll();
  toast("Ruta: " + T().name);
  setTimeout(() => { asegurarLecturas().catch(() => { /* se pedirán al abrir Reading */ }); }, 1200);
});

/* Mientras baja el contenido de la otra ruta, el selector se pone en espera. */
setLoadingListener(cargando => {
  document.body.classList.toggle("cargando-ruta", cargando);
  if (cargando) toast("Cargando la ruta…");
});

/* El botón del menú es el atajo; el control completo está en Ajustes. */
const themeBtn = $("#themeBtn");
const NOMBRE_TEMA = { light: "claro", dark: "oscuro" } as const;
onTheme(t => {
  if (!themeBtn) return;
  const nombre = t ? NOMBRE_TEMA[t] : "automático";
  themeBtn.textContent = "Tema: " + nombre;
  themeBtn.setAttribute("aria-label", "Tema " + nombre + ". Pulsa para cambiar.");
});
themeBtn?.addEventListener("click", () => {
  const t = cycleTheme();
  save();
  renderAjustes();
  toast(t ? "Tema: " + NOMBRE_TEMA[t] : "Tema: el de tu sistema");
});

$("#resetBtn")?.addEventListener("click", () => {
  if (!confirm("Esto borra el progreso guardado en este navegador. Si tienes sesión abierta, la copia del servidor no se toca. ¿Seguro?")) return;
  resetState();
  applyTheme();
  refreshAi();
  renderAll();
  toast("Progreso reiniciado");
});

buildNav();
buildTrackPicker();
applyTheme();

/* Enlace mágico: el token llega en el fragmento y no debe quedarse en la barra. */
const authResult = api.consumeAuthHash();

/**
 * El contenido de la ruta llega en su propio bundle, así que el arranque espera
 * a tenerlo antes de pintar. Mientras tanto se ve el cartel de carga del HTML.
 */
async function arrancar(): Promise<void> {
  try {
    await asegurarRuta();
  } catch {
    const boot = $("#boot");
    if (boot) {
      boot.innerHTML = "";
      boot.append(el("p", {}, "No se pudo cargar el contenido del curso. Comprueba la conexión y recarga."));
    }
    return;
  }
  $("#boot")?.remove();
  document.body.classList.add("listo");

  /* Primera visita: elegir ruta, diez preguntas y a estudiar. */
  if (haceFalta()) {
    montarOnboarding(() => { buildTrackPicker(); renderAll(); go("plan"); });
  }

  renderTutorModes();
  renderAll();
  refreshAi();

  const examDate = $<HTMLInputElement>("#examDate");
  if (examDate && S.examDate) examDate.value = S.examDate;

  if (authResult === "expired") toast("Ese enlace caducó o ya se usó. Pide otro.");
  if (authResult === "error") toast("No se pudo completar el acceso. Inténtalo otra vez.");

  const initial = authResult === "ok" ? "cuenta" : location.hash.replace("#", "");
  go(MODULES.some(m => m[0] === initial) ? initial : "panel");

  /* Las lecturas bajan por detrás: cuando entres en el módulo ya estarán. */
  setTimeout(() => { asegurarLecturas().catch(() => { /* se pedirán al abrir Reading */ }); }, 2500);

  /* Latido anónimo, una vez al día: sirve para saber dónde abandona la gente. */
  setTimeout(() => { latir(currentDay(), daysDone().d, streakLen()); }, 8000);

  startSync();
  api.refreshSession().then(async s => {
    if (!api.cuentasActivas()) {
      const b = document.querySelector('#nav button[data-go="cuenta"] span:last-child');
      if (b) b.textContent = "Tu cupo";
    }
    refreshAi();
    renderAccount();
    if (s.user) {
      await pullAndMerge();
      renderAll();
      if (authResult === "ok") { go("cuenta"); toast("Sesión iniciada como " + s.user.email); }
    }
  });
}

arrancar();

/* Contador de cuota siempre a la vista, junto a los botones de tema. */
const quotaChip = el("button", { class: "chip", type: "button", style: "cursor:pointer", onclick: () => go("cuenta") }, "IA: —");
$(".railfoot")?.append(quotaChip);
api.onSession(s => {
  const q = s.quota;
  // Publicada sin backend, el contador no tiene nada que contar: mejor decirlo
  // que dejar un guion que nadie entiende.
  const sinApi = api.apiDisponible() === false;
  quotaChip.textContent = sinApi
    ? "IA: sin servidor"
    : q ? "IA: " + q.remaining + (q.window === "día" ? " créditos" : " de prueba") : "IA: —";
  quotaChip.className = "chip" + (sinApi ? "" : q && q.remaining <= 0 ? " bad" : q && q.remaining <= 3 ? " warn" : "");
  quotaChip.title = sinApi
    ? "Esta copia no tiene servidor: el estudio funciona entero y las correcciones necesitan tu propia clave (Ajustes)"
    : s.user ? "Sesión: " + s.user.email : "Sin cuenta · pulsa para entrar";
  if (sinApi) quotaChip.onclick = () => go("ajustes");
});
onSyncStatus(() => {});

/* Minutos de estudio: se cuenta un minuto por cada minuto con actividad real. */
["pointerdown", "keydown", "input", "change"].forEach(ev =>
  document.addEventListener(ev, marcarActividad, { passive: true, capture: true }));
setInterval(tickMinuto, 60_000);

window.addEventListener("hashchange", () => {
  const k = location.hash.replace("#", "");
  if (MODULES.some(m => m[0] === k)) go(k);
});

/* Service worker: solo en producción, y avisando cuando hay versión nueva. */
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(import.meta.env.BASE_URL + "sw.js").then(reg => {
      setSwReg(reg);
      reg.addEventListener("updatefound", () => {
        const nw = reg.installing;
        if (!nw) return;
        nw.addEventListener("statechange", () => {
          if (nw.state === "installed" && navigator.serviceWorker.controller) {
            const bar = document.createElement("div");
            bar.className = "toast";
            bar.textContent = "Hay una versión nueva. ";
            const btn = document.createElement("button");
            btn.className = "btn small";
            btn.style.marginLeft = "8px";
            btn.type = "button";
            btn.textContent = "Actualizar";
            btn.onclick = () => { nw.postMessage({ type: "SKIP_WAITING" }); location.reload(); };
            bar.append(btn);
            document.body.append(bar);
          }
        });
      });
    }).catch(() => { /* sin service worker la app sigue funcionando, solo pierde el offline */ });
  });
}

console.info("Ruta B1 → B2 · contenido " + APP_VERSION);
