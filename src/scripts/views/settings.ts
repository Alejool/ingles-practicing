/** Módulo 16 · Ajustes: modelo, clave propia opcional, instalación, copia y offline. */

import { S, save, replaceState } from "../state";
import { $, el, toast } from "../dom";
import { AI_DEF, AI_MODELS, aiCfg, aiCopy, streamAi, refreshAi, usesOwnKey } from "../ai";
import { applyTheme, go, setTheme, temaEfectivo, type Tema } from "../nav";
import * as api from "../api";
import { resetSyncVersion } from "../sync";
import { pendientes, borrar, limpiarHechas, vaciar } from "../queue";
import { pulsoApagado, apagarPulso, vistos } from "../pulse";

/** Versión del contenido; acompaña a CACHE_VERSION del service worker. */
export const APP_VERSION = "3.2.0";

/** main.ts inyecta el repintado completo (evita un ciclo de imports). */
let afterImport: () => void = () => {};
export function setAfterImport(fn: () => void): void { afterImport = fn; }

let deferredPrompt: any = null;
let swReg: ServiceWorkerRegistration | null = null;
export function setSwReg(r: ServiceWorkerRegistration): void { swReg = r; }

window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); deferredPrompt = e; renderAjustes(); });
window.addEventListener("appinstalled", () => { deferredPrompt = null; toast("App instalada"); renderAjustes(); });

export function isStandalone(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone === true;
}

/**
 * El tema, con sus tres estados de verdad.
 *
 * «Automático» no es lo mismo que «claro»: sigue al sistema, así que la app se
 * pone oscura de noche sola. Por eso son tres botones y no un interruptor.
 */
function temaCard(): HTMLElement {
  const OPCIONES: Array<[Tema, string, string]> = [
    [null, "Automático", "Sigue a tu sistema"],
    ["light", "Claro", "Papel de día"],
    ["dark", "Oscuro", "Para estudiar de noche"],
  ];
  const grupo = el("div", { class: "segmento", role: "radiogroup", "aria-label": "Tema de la aplicación" });
  const botones: HTMLElement[] = [];

  const pintar = () => {
    OPCIONES.forEach(([valor], i) => {
      const activo = S.theme === valor;
      botones[i].setAttribute("aria-checked", String(activo));
      botones[i].setAttribute("tabindex", activo ? "0" : "-1");
    });
    pie.textContent = S.theme
      ? "Elegido a mano: se queda así en este dispositivo."
      : "Ahora mismo se ve " + (temaEfectivo() === "dark" ? "oscuro" : "claro") + ", porque es lo que pide tu sistema.";
  };

  const pie = el("p", { class: "tiny", style: "margin-top:10px" });

  OPCIONES.forEach(([valor, nombre, ayuda]) => {
    const b = el("button", {
      type: "button", class: "seg", role: "radio", "aria-checked": "false",
      onclick: () => { setTheme(valor); save(); pintar(); },
    },
      el("span", { class: "seg-t" }, nombre),
      el("span", { class: "seg-s" }, ayuda));
    botones.push(b);
    grupo.append(b);
  });

  // Flechas para moverse entre las tres opciones, como manda un radiogroup.
  grupo.addEventListener("keydown", (ev: KeyboardEvent) => {
    const i = botones.findIndex(b => b === document.activeElement);
    if (i < 0) return;
    const salto = ev.key === "ArrowRight" || ev.key === "ArrowDown" ? 1
      : ev.key === "ArrowLeft" || ev.key === "ArrowUp" ? -1 : 0;
    if (!salto) return;
    ev.preventDefault();
    const j = (i + salto + botones.length) % botones.length;
    (botones[j] as HTMLButtonElement).focus();
    setTheme(OPCIONES[j][0]); save(); pintar();
  });

  pintar();
  return el("div", { class: "card" },
    el("span", { class: "eyebrow" }, "Apariencia"),
    el("h3", { style: "margin:6px 0 10px" }, "Tema"),
    grupo, pie);
}

function modelCard(): HTMLElement {
  const cfg = aiCfg();
  const sel = el("select", { id: "aiModel" },
    AI_MODELS.map(([v]) => el("option", { value: v, selected: v === cfg.model ? "" : null }, v)));
  const desc = el("p", { class: "tiny", style: "margin-top:6px" }, AI_MODELS.find(m => m[0] === cfg.model)?.[1] || "");
  sel.addEventListener("change", () => {
    S.ai = { ...aiCfg(), model: sel.value };
    save();
    desc.textContent = AI_MODELS.find(m => m[0] === sel.value)?.[1] || "";
    toast("Modelo: " + sel.value);
  });
  return el("div", { class: "card" },
    el("span", { class: "eyebrow" }, "Motor de corrección"),
    el("h3", { style: "margin:6px 0 8px" }, "Modelo"),
    el("div", { style: "max-width:340px" }, sel), desc);
}

function ownKeyCard(): HTMLElement {
  const cfg = aiCfg();
  const keyIn = el("input", { type: "password", id: "aiKey", value: cfg.key, placeholder: "sk-…", autocomplete: "off", spellcheck: "false" });
  const urlIn = el("input", { type: "text", id: "aiUrl", value: cfg.url, spellcheck: "false", autocomplete: "off" });
  const test = el("div", { style: "margin-top:12px" });
  const status = el("span", { class: "chip " + (usesOwnKey() ? "ok" : "") }, usesOwnKey() ? "Clave propia activa" : "Usando la cuota compartida");

  return el("div", { class: "card", style: "margin-top:12px" },
    el("div", { class: "row", style: "justify-content:space-between" },
      el("span", { class: "eyebrow" }, "Avanzado · opcional"), status),
    el("h3", { style: "margin:6px 0 8px" }, "Usar tu propia clave de DeepSeek"),
    el("p", { class: "small", style: "margin-bottom:14px" },
      "Por defecto las correcciones pasan por el servidor de la app, que tiene su propio límite. Si pones aquí tu clave, las peticiones salen directamente de este navegador a DeepSeek: pagas tú y no gastas la cuota compartida. La clave se guarda solo en este dispositivo y no se sincroniza ni se exporta."),
    el("div", { class: "grid g2" },
      el("div", {}, el("label", { class: "lbl", for: "aiKey" }, "API key"), keyIn,
        el("div", { class: "row", style: "margin-top:8px" },
          el("button", { class: "btn ghost small", type: "button", onclick: () => { keyIn.type = keyIn.type === "password" ? "text" : "password"; } }, "Ver / ocultar"),
          el("a", { class: "btn ghost small", href: "https://platform.deepseek.com/api_keys", target: "_blank", rel: "noopener", style: "text-decoration:none" }, "Obtener una clave"))),
      el("div", {}, el("label", { class: "lbl", for: "aiUrl" }, "Endpoint"), urlIn,
        el("p", { class: "tiny", style: "margin-top:6px" }, "Solo si usas un proxy propio. Con la API oficial, déjalo como está."))),
    el("div", { class: "row", style: "margin-top:14px" },
      el("button", {
        class: "btn", type: "button", onclick: () => {
          S.ai = { ...aiCfg(), key: keyIn.value.trim(), url: urlIn.value.trim() || AI_DEF.url };
          save(); refreshAi(); renderAjustes();
          toast(keyIn.value.trim() ? "Clave guardada en este dispositivo" : "Vuelves a la cuota compartida");
        },
      }, "Guardar"),
      el("button", {
        class: "btn ghost", type: "button", onclick: async (ev: any) => {
          const b = ev.target as HTMLButtonElement;
          b.disabled = true; const old = b.textContent; b.textContent = "Probando…";
          S.ai = { ...aiCfg(), key: keyIn.value.trim(), url: urlIn.value.trim() || AI_DEF.url };
          save(); refreshAi();
          test.innerHTML = "";
          try {
            const r = await streamAi("test", {});
            test.append(el("div", { class: "fb" },
              (usesOwnKey() ? "Tu clave funciona. " : "El servidor compartido responde. ") + "Respuesta del modelo: " + r.trim()));
          } catch (e: any) {
            test.append(el("div", { class: "fb err" }, aiCopy(e)));
          } finally { b.disabled = false; b.textContent = old; renderAjustes(); }
        },
      }, "Probar conexión"),
      usesOwnKey() ? el("button", {
        class: "btn ghost", type: "button", onclick: () => {
          if (!confirm("¿Quitar la clave y volver a la cuota compartida?")) return;
          S.ai = { ...aiCfg(), key: "" }; save(); refreshAi(); renderAjustes(); toast("Clave borrada");
        },
      }, "Quitar la clave") : null),
    test);
}

function installCard(): HTMLElement {
  if (isStandalone()) {
    return el("div", { class: "card", style: "margin-top:12px" },
      el("span", { class: "eyebrow" }, "Instalación"),
      el("h3", { style: "margin:6px 0 8px" }, "Ya está instalada"),
      el("p", { class: "small" }, "Estás usando la versión instalada. Funciona sin conexión salvo las correcciones con IA, que necesitan internet."));
  }
  return el("div", { class: "card", style: "margin-top:12px" },
    el("span", { class: "eyebrow" }, "Instalación"),
    el("h3", { style: "margin:6px 0 8px" }, "Instalar en tu dispositivo"),
    el("p", { class: "small" }, "Instalada se abre a pantalla completa, arranca sin conexión y guarda el progreso en el dispositivo."),
    el("div", { class: "row", style: "margin-top:12px" },
      deferredPrompt ? el("button", {
        class: "btn", type: "button", onclick: async () => {
          deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt = null; renderAjustes();
        },
      }, "Instalar ahora") : null,
      el("span", { class: "tiny", style: "max-width:52ch" },
        deferredPrompt ? "" : "Si no ves el botón: en Chrome/Edge usa el menú ⋮ → «Instalar aplicación». En iPhone abre en Safari → Compartir → «Añadir a pantalla de inicio».")));
}

function backupCard(): HTMLElement {
  const fileIn = el("input", {
    type: "file", accept: "application/json", style: "display:none",
    onchange: (e: any) => {
      const f = e.target.files[0];
      if (!f) return;
      const rd = new FileReader();
      rd.onload = () => {
        try {
          const data = JSON.parse(String(rd.result));
          if (!data || typeof data !== "object") throw new Error("formato");
          replaceState(data);
          resetSyncVersion();
          applyTheme(); refreshAi(); afterImport(); go("panel");
          toast("Progreso importado");
        } catch { toast("Ese archivo no es una copia válida"); }
      };
      rd.readAsText(f);
    },
  });

  return el("div", { class: "card", style: "margin-top:12px" },
    el("span", { class: "eyebrow" }, "Copia de seguridad"),
    el("h3", { style: "margin:6px 0 8px" }, "Llevar tu progreso a mano"),
    el("p", { class: "small" }, api.isSignedIn()
      ? "Con la sesión abierta el progreso ya viaja solo entre dispositivos. Esta copia es por si quieres un respaldo tuyo, fuera del servidor."
      : "Sin cuenta, el progreso vive solo en este navegador. Si borras los datos del sitio o cambias de móvil, se pierde: exporta de vez en cuando o entra con tu correo en el módulo 15."),
    el("div", { class: "row", style: "margin-top:12px" },
      el("button", {
        class: "btn", type: "button", onclick: () => {
          const copy: any = structuredClone(S);
          if (copy.ai) copy.ai = { ...copy.ai, key: "" };
          const blob = new Blob([JSON.stringify(copy, null, 2)], { type: "application/json" });
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = "ruta-b1b2-" + new Date().toISOString().slice(0, 10) + ".json";
          document.body.append(a); a.click(); a.remove();
          setTimeout(() => URL.revokeObjectURL(a.href), 4000);
        },
      }, "Exportar progreso"),
      el("button", { class: "btn ghost", type: "button", onclick: () => fileIn.click() }, "Importar copia"),
      fileIn),
    el("p", { class: "tiny", style: "margin-top:8px" }, "La exportación no incluye la API key, a propósito."));
}

function offlineCard(): HTMLElement {
  return el("div", { class: "card", style: "margin-top:12px" },
    el("span", { class: "eyebrow" }, "Modo offline"),
    el("h3", { style: "margin:6px 0 8px" }, "Qué funciona sin internet"),
    el("div", { class: "tblwrap", style: "margin-top:8px" }, el("table", {},
      el("thead", {}, el("tr", {}, el("th", {}, "Módulo"), el("th", {}, "Sin conexión"))),
      el("tbody", {}, [
        ["Diagnóstico, plan, gramática, vocabulario, Use of English, lectura, simulacro", "Sí, completo"],
        ["Writing y Speaking (consignas, rúbricas, modelos, cronómetro)", "Sí"],
        ["Correcciones con IA y tutor", "No: necesitan internet"],
        ["Progreso, cuaderno de errores, tarjetas", "Sí, en el dispositivo"],
        ["Sincronización entre dispositivos", "Se reanuda al volver la conexión"],
      ].map(([a, b]) => el("tr", {}, el("td", {}, a), el("td", {}, b)))))),
    el("p", { class: "tiny", style: "margin-top:10px" },
      "El esqueleto de la app se guarda al instalarla. El contenido de cada ruta y las lecturas se guardan " +
      "según los usas, para no gastarte datos en la ruta que no estudias. Si vas a estar sin cobertura, " +
      "descárgalo todo de una vez con el botón de abajo."),
    el("div", { class: "row", style: "margin-top:12px" },
      descargarTodoBtn(),
      el("button", {
        class: "btn ghost small", type: "button", onclick: async () => {
          if (!swReg) { toast("El service worker no está activo"); return; }
          await swReg.update();
          toast("Buscando actualización…");
        },
      }, "Buscar actualización"),
      el("span", { class: "tiny" }, "Versión de contenido " + APP_VERSION)));
}

/** Pide al service worker que se guarde también el contenido que aún no has abierto. */
function descargarTodoBtn(): HTMLElement {
  const btn = el("button", { class: "btn small", type: "button" }, "Descargar todo para sin conexión") as HTMLButtonElement;
  btn.addEventListener("click", () => {
    const sw = navigator.serviceWorker?.controller;
    if (!sw) { toast("Instala la app o recarga: el modo offline aún no está activo"); return; }
    btn.disabled = true;
    btn.textContent = "Descargando…";
    const alTerminar = (ev: MessageEvent) => {
      if (ev.data?.type !== "WARMED") return;
      navigator.serviceWorker.removeEventListener("message", alTerminar);
      btn.disabled = false;
      btn.textContent = "Descargado ✓";
      toast(ev.data.n ? "Listo: " + ev.data.n + " archivos guardados" : "Ya lo tenías todo guardado");
    };
    navigator.serviceWorker.addEventListener("message", alTerminar);
    sw.postMessage({ type: "WARM" });
    // Si el SW no contesta, no dejamos el botón colgado.
    setTimeout(() => {
      if (!btn.disabled) return;
      navigator.serviceWorker.removeEventListener("message", alTerminar);
      btn.disabled = false;
      btn.textContent = "Descargar todo para sin conexión";
      toast("La descarga está tardando; sigue en segundo plano");
    }, 30000);
  });
  return btn;
}

/**
 * Qué sale de este navegador y qué no.
 *
 * El latido es la única telemetría de la app, y se puede apagar aquí mismo sin
 * perder nada: no afecta al progreso, a la sincronización ni a las correcciones.
 */
function privacidadCard(): HTMLElement {
  const apagado = pulsoApagado();
  const chip = el("span", { class: "chip " + (apagado ? "" : "ok") }, apagado ? "Apagado" : "Activo");
  return el("div", { class: "card", style: "margin-top:12px" },
    el("div", { class: "row", style: "justify-content:space-between" },
      el("span", { class: "eyebrow" }, "Privacidad"), chip),
    el("h3", { style: "margin:6px 0 8px" }, "Estadísticas anónimas de uso"),
    el("p", { class: "small" },
      "Una vez al día la app manda cinco números: en qué día del plan vas, cuántos llevas hechos, tu racha, " +
      "qué ruta estudias y qué módulos has abierto alguna vez. Sirve para saber en qué día abandona la gente " +
      "y arreglar justo ese día."),
    el("div", { class: "tblwrap", style: "margin-top:10px" }, el("table", {},
      el("thead", {}, el("tr", {}, el("th", {}, "Se manda"), el("th", {}, "No se manda"))),
      el("tbody", {}, el("tr", {},
        el("td", {}, "Día del plan, días hechos, racha, ruta y lista de módulos abiertos"),
        el("td", {}, "Correo, nombre, id de cuenta, IP, lo que escribes y lo que corriges"))))),
    el("p", { class: "tiny", style: "margin-top:8px" },
      "El servidor guarda un hash con pimienta del id de este dispositivo: sirve para no contarte dos veces " +
      "y para nada más, no se puede deshacer hasta ti ni cruzar con las cuentas."),
    el("p", { class: "tiny", style: "margin-top:6px" },
      "Módulos anotados en este dispositivo: " + (vistos().length || "ninguno todavía")),
    el("div", { class: "row", style: "margin-top:12px" },
      el("button", {
        class: "btn " + (apagado ? "" : "ghost"), type: "button", onclick: () => {
          apagarPulso(!apagado);
          renderAjustes();
          toast(apagado ? "Estadísticas anónimas activadas" : "Estadísticas anónimas apagadas");
        },
      }, apagado ? "Volver a activarlas" : "Apagar las estadísticas"),
      el("span", { class: "tiny" }, "Es de este navegador, no de tu cuenta.")));
}

/**
 * Lo que se quedó sin red.
 *
 * Se pinta vacía y se rellena cuando IndexedDB responde, para no bloquear el
 * resto de Ajustes mientras tanto.
 */
function pendientesCard(): HTMLElement {
  const box = el("div", { class: "card", style: "margin-top:12px" });
  const cuerpo = el("div", {});
  box.append(
    el("span", { class: "eyebrow" }, "Sin conexión"),
    el("h3", { style: "margin:6px 0 8px" }, "Peticiones guardadas"),
    el("p", { class: "tiny" },
      "Si pides una corrección sin cobertura, tu texto no se pierde: espera aquí y se lanza sola al volver la red."),
    cuerpo);

  pendientes().then(lista => {
    cuerpo.innerHTML = "";
    if (!lista.length) {
      cuerpo.append(el("p", { class: "small", style: "margin-top:8px" }, "No hay nada esperando."));
      return;
    }
    lista.forEach(p => {
      const fila = el("div", { style: "padding:9px 0;border-bottom:1px solid var(--line)" },
        el("div", { class: "row", style: "justify-content:space-between;gap:8px" },
          el("span", { class: "small", style: "font-weight:600" }, p.rotulo),
          el("span", {
            class: "chip" + (p.estado === "hecha" ? " ok" : p.estado === "fallida" ? " bad" : " warn"),
          }, p.estado === "hecha" ? "lista" : p.estado === "fallida" ? "falló" : "esperando red")),
        el("div", { class: "tiny", style: "margin-top:2px" },
          new Date(p.creado).toLocaleString("es") + (p.error ? " · " + p.error : "")));

      if (p.estado === "hecha" && p.respuesta) {
        const pane = el("div", { class: "fb hidden", style: "margin-top:8px" }, p.respuesta);
        const ver = el("button", { class: "btn ghost small", type: "button" }, "Ver la respuesta");
        ver.addEventListener("click", () => {
          pane.classList.toggle("hidden");
          ver.textContent = pane.classList.contains("hidden") ? "Ver la respuesta" : "Ocultar";
        });
        fila.append(el("div", { class: "row", style: "margin-top:8px" }, ver, quitarBtn(p.id)), pane);
      } else {
        fila.append(el("div", { class: "row", style: "margin-top:8px" },
          el("button", {
            class: "btn ghost small", type: "button",
            onclick: () => { vaciar().then(renderAjustes); toast("Reintentando…"); },
          }, "Reintentar ahora"),
          quitarBtn(p.id)));
      }
      cuerpo.append(fila);
    });

    if (lista.some(p => p.estado !== "pendiente")) {
      cuerpo.append(el("div", { class: "row", style: "margin-top:10px" },
        el("button", {
          class: "btn ghost small", type: "button",
          onclick: () => { limpiarHechas().then(renderAjustes); },
        }, "Quitar las ya resueltas")));
    }
  }).catch(() => {
    cuerpo.innerHTML = "";
    cuerpo.append(el("p", { class: "tiny", style: "margin-top:8px" },
      "Este navegador no guarda peticiones offline (modo privado o IndexedDB desactivado)."));
  });

  return box;
}

function quitarBtn(id: number): HTMLElement {
  return el("button", {
    class: "btn ghost small", type: "button",
    onclick: () => { borrar(id).then(renderAjustes); },
  }, "Quitar");
}

export function renderAjustes(): void {
  const out = $("#ajustesOut");
  if (!out) return;
  out.innerHTML = "";
  out.append(temaCard(), modelCard(), ownKeyCard(), installCard(), backupCard(), offlineCard(), pendientesCard(), privacidadCard());
}

export function renderAjustesStatus(): void {
  renderAjustes();
}
