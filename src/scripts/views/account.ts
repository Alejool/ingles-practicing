/** Módulo 15 · Cuenta: enlace mágico, cuota y sincronización del progreso. */

import { $, el, toast } from "../dom";
import * as api from "../api";
import { pullAndMerge, flush, onSyncStatus, syncStatus, resetSyncVersion } from "../sync";
import { usesOwnKey } from "../ai";
import { go } from "../nav";

let sent: string | null = null;

function quotaCard(q: api.Quota | null): HTMLElement {
  if (!q) {
    return el("div", { class: "card" },
      el("span", { class: "eyebrow" }, "Cuota de IA"),
      el("h3", { style: "margin:6px 0 8px" }, "Sin contacto con el servidor"),
      el("p", { class: "small" }, "No se pudo consultar la cuota. Puede que estés sin conexión o que esta copia de la app no tenga la API desplegada. Todo lo demás sigue funcionando; para corregir writing y speaking puedes poner tu propia clave en Ajustes."));
  }
  const usedPct = q.limit ? Math.min(100, Math.round((q.used / q.limit) * 100)) : 0;
  const kids: any[] = [
    el("span", { class: "eyebrow" }, "Cuota de IA"),
    el("h3", { style: "margin:6px 0 10px" },
      q.remaining + (q.window === "día" ? " créditos hoy" : " créditos de prueba")),
    el("div", { class: "bar" }, el("i", { style: "width:" + usedPct + "%" })),
    el("p", { class: "tiny", style: "margin-top:8px" },
      "Usadas " + q.used + " de " + q.limit + (q.window === "día" ? " hoy." : " en total.") +
      (q.monthlyLimit ? " Este mes: " + q.monthlyUsed + " de " + q.monthlyLimit + "." : "")),
  ];
  if (!q.authenticated) {
    kids.push(el("p", { class: "small", style: "margin-top:10px" },
      "Sin cuenta tienes un cupo de prueba por dispositivo. Con tu correo pasa a ser diario y bastante más amplio."));
  }
  if (q.globalRemaining <= 0) {
    kids.push(el("p", { class: "small", style: "margin-top:10px;color:var(--bad)" },
      "Hoy se agotó el uso compartido de toda la app. Vuelve mañana o usa tu propia clave en Ajustes."));
  }
  return el("div", { class: "card" }, ...kids);
}

function signInCard(): HTMLElement {
  const input = el("input", { type: "text", id: "loginEmail", placeholder: "tu@correo.com", autocomplete: "email", spellcheck: "false" });
  const out = el("div", { style: "margin-top:12px" });

  async function request(btn: HTMLButtonElement) {
    const email = input.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email)) { toast("Ese correo no parece válido"); return; }
    btn.disabled = true;
    const old = btn.textContent;
    btn.textContent = "Enviando…";
    out.innerHTML = "";
    try {
      const res = await api.requestLoginLink(email);
      sent = email;
      if (res.delivery === "mailbox") {
        // Docker trae un buzón local: el correo no sale a internet, se queda ahí.
        const url = res.mailboxUrl || "http://localhost:8025";
        out.append(el("div", { class: "fb" },
          `Esta instalación usa un buzón local de desarrollo, así que el correo NO llega a ${email}: se queda en el buzón. Ábrelo ahí y pulsa el enlace; caduca en ${res.minutes} minutos y solo funciona una vez.`,
          el("div", { style: "margin-top:12px" },
            el("a", { class: "btn small", href: url, target: "_blank", rel: "noopener", style: "text-decoration:none" }, "Abrir el buzón")),
          el("div", { class: "tiny", style: "margin-top:10px" },
            "Para que los correos salgan de verdad, configura MAIL_PROVIDER=resend con tu RESEND_API_KEY en el .env y reinicia.")));
      } else {
        out.append(el("div", { class: "fb" },
          `Te mandé un enlace a ${email}. Ábrelo desde este mismo dispositivo y entras directo; caduca en ${res.minutes} minutos y solo funciona una vez. Si no aparece, mira en spam.`));
      }
    } catch (e: any) {
      out.append(el("div", { class: "fb err" }, e?.message || "No se pudo enviar el correo."));
    } finally {
      btn.disabled = false;
      btn.textContent = old;
    }
  }

  const btn = el("button", { class: "btn", type: "button", onclick: () => request(btn) }, "Enviarme el enlace");
  input.addEventListener("keydown", (e: KeyboardEvent) => { if (e.key === "Enter") request(btn); });

  return el("div", { class: "card" },
    el("span", { class: "eyebrow" }, "Entrar"),
    el("h3", { style: "margin:6px 0 8px" }, "Sin contraseña"),
    el("p", { class: "small", style: "margin-bottom:14px" }, "Escribe tu correo y te llega un enlace de un solo uso. No hay contraseñas que recordar ni que se puedan filtrar."),
    el("div", { style: "max-width:420px" }, el("label", { class: "lbl", for: "loginEmail" }, "Correo"), input),
    el("div", { class: "row", style: "margin-top:12px" }, btn),
    out,
    el("p", { class: "tiny", style: "margin-top:12px" }, "Solo se guarda tu correo y tu progreso. No hay perfil, ni analítica, ni nada que compartir con terceros."));
}

function accountCard(email: string): HTMLElement {
  const st = syncStatus();
  const label =
    st.state === "working" ? "Sincronizando…" :
    st.state === "error" ? "Error: " + st.message :
    st.state === "idle" ? (st.at ? "Al día · " + new Date(st.at).toLocaleString() : "Al día") :
    "Sin sincronizar";

  return el("div", { class: "card" },
    el("div", { class: "row", style: "justify-content:space-between" },
      el("span", { class: "eyebrow" }, "Sesión"),
      el("span", { class: "chip " + (st.state === "error" ? "bad" : st.state === "working" ? "warn" : "ok") }, label)),
    el("h3", { style: "margin:6px 0 8px" }, email),
    el("p", { class: "small" }, "Tu progreso se guarda en el servidor y se funde con lo que tengas en cada dispositivo: nunca se pierde una tarea marcada ni una tarjeta que ya dominabas."),
    el("div", { class: "row", style: "margin-top:14px" },
      el("button", {
        class: "btn", type: "button", onclick: async (e: any) => {
          e.target.disabled = true;
          await pullAndMerge();
          e.target.disabled = false;
          renderAccount();
          toast("Progreso sincronizado");
        },
      }, "Sincronizar ahora"),
      el("button", {
        class: "btn ghost", type: "button", onclick: async () => {
          await flush();
          await api.logout();
          resetSyncVersion();
          renderAccount();
          toast("Sesión cerrada");
        },
      }, "Cerrar sesión")),
    el("p", { class: "tiny", style: "margin-top:10px" }, "Al cerrar sesión el progreso se queda en este dispositivo; no se borra nada."));
}

export function renderAccount(): void {
  const out = $("#cuentaOut");
  if (!out) return;
  out.innerHTML = "";
  const s = api.session();

  if (usesOwnKey()) {
    out.append(el("div", { class: "card", style: "margin-bottom:12px" },
      el("span", { class: "eyebrow" }, "Clave propia activa"),
      el("h3", { style: "margin:6px 0 8px" }, "No estás gastando la cuota compartida"),
      el("p", { class: "small" }, "Tienes configurada tu propia clave de DeepSeek en Ajustes, así que las correcciones van por tu cuenta y sin límite de la app. La sesión sigue sirviendo para sincronizar el progreso.")));
  }

  out.append(s.user ? accountCard(s.user.email) : signInCard());
  out.append(el("div", { style: "margin-top:12px" }, quotaCard(s.quota)));

  out.append(el("div", { class: "card", style: "margin-top:12px" },
    el("span", { class: "eyebrow" }, "Qué necesita cuenta y qué no"),
    el("div", { class: "tblwrap", style: "margin-top:10px" }, el("table", {},
      el("thead", {}, el("tr", {}, el("th", {}, "Módulo"), el("th", {}, "Sin cuenta"), el("th", {}, "Con cuenta"))),
      el("tbody", {}, [
        ["Diagnóstico, plan, gramática, vocabulario, Use of English, lectura, simulacro", "Completo", "Completo y sincronizado"],
        ["Writing, Speaking, cuaderno de errores y tutor con IA", "Cupo de prueba", "Cupo diario"],
        ["Progreso entre dispositivos", "Exportar e importar a mano", "Automático"],
      ].map(([a, b, c]) => el("tr", {}, el("td", {}, a), el("td", {}, b), el("td", {}, c))))))));
}

onSyncStatus(() => {
  if ($("#cuentaOut") && api.session().user) renderAccount();
});
