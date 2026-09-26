/**
 * Módulo 00 · el panel.
 *
 * Todo lo de aquí se calcula: el reto de hoy, la línea diaria de estudio y las
 * insignias salen de lo que ya has hecho. No hay nada que marcar a mano.
 */

import { P } from "../state";
import { $, el, pct } from "../dom";
import {
  levelLabelData, daysDone, srsCounts, streakLen, mastery, SKILLS,
  currentDay, isDayDone, setOpenDay, challengeState, streakStrip, streakBest,
  resumenHoy, earned, freshAchievements, markAchievementsSeen, counterToday,
} from "../progress";
import { T, days } from "../track";
import { pendientes, palabras } from "../mine";
import { go } from "../nav";
import { setIntent } from "../intent";
import { FOCUS_LABEL } from "../../data/schedule";
import { challengeFor } from "../../data/challenges";
import { ACHIEVEMENTS } from "../../data/achievements";
import type { StepGoto } from "../../data/types";

let marcando = false;

function irA(g: StepGoto): void {
  setIntent(g);
  go(g.module);
}

export function renderPanel(): void {
  const lv = levelLabelData();
  const pd = daysDone();
  const sc = srsCounts();
  const all = days();
  const hoy = all[currentDay() - 1] || all[0];

  const tiles = $("#tiles");
  if (!tiles) return;
  tiles.innerHTML = "";
  const data: Array<[string, string, string]> = [
    [lv.v, lv.l, lv.s],
    ["Día " + currentDay(), "Vas por aquí", "Semana " + (hoy?.week ?? 1) + " · bloque " + (hoy?.block ?? "A")],
    [pd.d + "/" + pd.t, "Días hechos", pct(pd.d, pd.t) + "% del plan"],
    [String(streakLen()), "Días seguidos", "Mejor racha: " + streakBest()],
    [String(sc.due), "Tarjetas para hoy", "de " + sc.total + " en los mazos"],
    [String(pendientes().length), "Palabras difíciles", palabras().length + " en tu cuaderno"],
    [P().mock.best !== null ? P().mock.best + "%" : "—", "Mejor simulacro", P().mock.history.length ? P().mock.history.length + " de " + T().mocks.length + " hechos" : "Sin intentos"],
  ];
  data.forEach(([v, l, s]) => tiles.append(el("div", { class: "tile" },
    el("span", { class: "l" }, l), el("span", { class: "v" }, v), el("span", { class: "tiny" }, s))));

  /* La sesión de hoy, en el panel, para poder empezar sin buscar nada. */
  const today = $("#todayCard");
  if (today && hoy) {
    today.innerHTML = "";
    today.append(
      el("div", { class: "row", style: "justify-content:space-between;gap:10px" },
        el("span", { class: "eyebrow" }, "La sesión de hoy · " + T().name),
        el("span", { class: "chip warn" }, FOCUS_LABEL[hoy.focus])),
      el("h3", { style: "margin:8px 0 4px;font-size:23px" }, "Día " + hoy.n + " · " + hoy.t),
      el("p", { class: "small" }, hoy.goal),
      el("div", { style: "margin-top:10px" }, hoy.blocks.map((b, i) =>
        el("div", { class: "row", style: "gap:10px;padding:5px 0;border-bottom:1px solid var(--line)" },
          el("span", { class: "mono tiny", style: "flex:0 0 22px" }, String(i + 1)),
          el("span", { class: "mono tiny", style: "flex:0 0 52px" }, b.min),
          el("span", { class: "small", style: "flex:0 0 110px;font-weight:500" }, b.name),
          el("span", { class: "tiny", style: "flex:1" }, b.what)))),
      el("div", { class: "row", style: "margin-top:14px" },
        el("button", { class: "btn", type: "button", onclick: () => { setOpenDay(hoy.n); go("plan"); } }, "Empezar el día " + hoy.n),
        el("button", { class: "btn ghost", type: "button", onclick: () => go("vocab") }, sc.due + " tarjetas pendientes")));
  }

  /* Reto del día: se cumple solo con lo que vayas haciendo. */
  const rc = $("#retoCard");
  if (rc && hoy) {
    const c = challengeFor(hoy.n);
    const st = challengeState(c);
    const p = Math.min(100, Math.round((st.have / st.goal) * 100));
    rc.innerHTML = "";
    rc.setAttribute("style", st.done ? "border-color:var(--ok)" : "");
    rc.append(el("div", { class: "reto" },
      el("div", { class: "row", style: "justify-content:space-between" },
        el("span", { class: "eyebrow" }, "Reto de hoy"),
        el("span", { class: "chip" + (st.done ? " ok" : " warn") }, st.done ? "Conseguido" : st.have + " / " + st.goal)),
      el("h3", { style: "margin:2px 0 0;font-size:20px" }, c.t),
      el("p", { class: "small" }, c.d),
      el("span", { class: "goalbar" }, el("i", { style: "width:" + p + "%" })),
      el("div", { class: "row" },
        st.done
          ? el("span", { class: "tiny" }, "Hecho. Mañana toca otro.")
          : c.goto
            ? el("button", { class: "btn ghost small", type: "button", onclick: () => irA(c.goto!) }, c.goto.label || "Ir")
            : el("button", { class: "btn ghost small", type: "button", onclick: () => { setOpenDay(hoy.n); go("plan"); } }, "Abrir el plan"))));
    rc.setAttribute("data-done", st.done ? "1" : "0");
  }

  /* Línea diaria de estudio: cinco semanas de cuadros. */
  const racha = $("#rachaCard");
  if (racha) {
    const strip = streakStrip(35);
    const hechos = strip.filter(c => c.on).length;
    racha.innerHTML = "";
    const tira = el("div", { class: "streakstrip" });
    strip.forEach((c, i) => {
      if (i > 0 && i % 7 === 0) tira.append(el("span", { class: "wk" }));
      tira.append(el("i", { class: (c.on ? "on" : "") + (c.today ? " today" : ""), title: c.label }));
    });
    racha.append(
      el("div", { class: "row", style: "justify-content:space-between" },
        el("span", { class: "eyebrow" }, "Línea diaria de estudio"),
        el("span", { class: "chip" + (streakLen() >= 3 ? " ok" : "") }, streakLen() + " seguidos")),
      el("h3", { style: "margin:2px 0 0;font-size:20px" }, "Las últimas cinco semanas"),
      el("p", { class: "small" }, hechos + " de 35 días con actividad. Un día cuenta en cuanto respondes algo, no hace falta terminarlo."),
      tira,
      el("p", { class: "tiny", style: "margin-top:8px" }, "Mejor racha hasta ahora: " + streakBest() + " días seguidos."));
  }

  /* Lo que llevas hecho hoy, en crudo. */
  const hc = $("#hoyCard");
  if (hc) {
    hc.innerHTML = "";
    const fila = el("div", { class: "metricrow" });
    resumenHoy().forEach(([nombre, v]) => fila.append(
      el("div", { class: "m" }, el("b", {}, String(v)), el("span", {}, nombre))));
    hc.append(
      el("span", { class: "eyebrow" }, "Hoy"),
      el("h3", { style: "margin-top:4px" }, "Lo que llevas hecho"),
      el("p", { class: "tiny", style: "margin-top:2px" }, "Se pone a cero cada noche. Los minutos solo cuentan mientras trabajas de verdad en la app."),
      fila,
      counterToday("corrections") > 0
        ? el("p", { class: "tiny", style: "margin-top:8px" }, counterToday("corrections") + " corrección(es) pedidas hoy.")
        : null);
  }

  const m = $("#meters");
  if (m) {
    m.innerHTML = "";
    SKILLS.forEach(([k, name]) => {
      const p = mastery(k);
      m.append(el("div", { class: "meter" },
        el("span", { class: "mn" }, name),
        el("span", { class: "bar" }, el("i", { style: "width:" + (p === null ? 0 : p) + "%" })),
        el("span", { class: "mv" }, p === null ? "—" : p + "%")));
    });
  }

  const nx = $("#nextup");
  if (nx) {
    nx.innerHTML = "";
    const steps: Array<[string, string]> = [];
    if (!P().diag.done) steps.push(["Haz el diagnóstico y sabrás por dónde empezar", "diag"]);
    if (sc.due > 0) steps.push([sc.due + " tarjetas de vocabulario vencidas", "vocab"]);
    if (pendientes().length > 0) steps.push([pendientes().length + " palabras difíciles esperando que las escribas", "mine"]);
    if (!(P().quiz?.history || []).length) steps.push(["Aún no has hecho ninguna prueba rápida", "quiz"]);
    const weak = (SKILLS.map(([k, n]) => [k, n, mastery(k)]) as Array<[string, string, number | null]>)
      .filter(x => x[2] !== null && x[2] < 70)
      .sort((a, b) => (a[2] as number) - (b[2] as number))[0];
    if (weak) steps.push(["Punto débil: " + weak[1] + " (" + weak[2] + "%)",
      weak[0] === "read" || weak[0] === "listen" ? "input" : weak[0] === "vocab" ? "vocab" : weak[0] === "uoe" ? "uoe" : weak[0] === "mock" ? "mock" : "gram"]);
    if (P().mock.history.length === 0) steps.push(["Aún no has hecho un simulacro cronometrado", "mock"]);
    steps.slice(0, 4).forEach(([txt, dest]) => {
      nx.append(el("div", { class: "row", style: "justify-content:space-between;gap:8px;border-bottom:1px solid var(--line);padding-bottom:8px" },
        el("span", { class: "small", style: "flex:1" }, txt),
        el("button", { class: "btn ghost small", type: "button", onclick: () => go(dest) }, "Ir")));
    });
    if (!steps.length) nx.append(el("p", { class: "small" }, "Todo al día. Abre el plan y haz la sesión de hoy."));
  }

  /* Insignias. Las nuevas se marcan hasta que se miran. */
  const lg = $("#logros");
  if (lg) {
    const tengo = new Set(earned());
    const nuevas = new Set(freshAchievements());
    lg.innerHTML = "";
    ACHIEVEMENTS.forEach(a => {
      const on = tengo.has(a.id);
      lg.append(el("div", { class: "badge", "data-on": on ? "1" : "0", "data-new": nuevas.has(a.id) ? "1" : null, title: a.d },
        el("span", { class: "ic" }, a.icon),
        el("div", {},
          el("div", { class: "bt" }, a.t, nuevas.has(a.id) ? el("span", { class: "new" }, "nuevo") : null),
          el("div", { class: "bd" }, a.d))));
    });
    if (nuevas.size && !marcando) {
      // Una vez vistas dejan de destacarse, pero no se pierden.
      marcando = true;
      setTimeout(() => { markAchievementsSeen(); marcando = false; }, 5000);
    }
  }

  const pl = $("#progline");
  if (pl) {
    pl.innerHTML = "";
    const cw = currentDay();
    all.forEach(d => pl.append(el("i", {
      class: isDayDone(d.n) ? "d" : (d.n === cw ? "c" : ""),
      title: "Día " + d.n + " · " + d.t,
    })));
  }
}
