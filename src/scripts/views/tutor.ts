import { $, el, toast } from "../dom";
import { touchDay } from "../state";
import { streamAi, aiCopy, needsAccount, refreshAi } from "../ai";
import type { TutorMode } from "../../../shared/prompts";
import { go } from "../nav";

const TUTOR_MODES: Array<[TutorMode, string, string]> = [
  ["general", "Conversación libre", "Chat abierto con corrección después de cada mensaje."],
  ["interview", "Entrevista de trabajo", "Simula una entrevista técnica en inglés y evalúa tus respuestas."],
  ["exam", "Examinador de Speaking", "Te hace preguntas del examen y puntúa con los criterios oficiales."],
  ["explain", "Explícame esta duda", "Explicación gramatical en español con ejemplos y contraste con el español."],
];

let tutorMode: TutorMode = "general";
let turns: Array<{ role: "user" | "assistant"; content: string }> = [];
let tutorCtl: AbortController | null = null;

export function renderTutorModes(): void {
  const t = $("#tutorModes");
  if (!t) return;
  t.innerHTML = "";
  TUTOR_MODES.forEach(([k, n, d]) =>
    t.append(el("button", {
      class: "btn " + (k === tutorMode ? "" : "ghost") + " small",
      type: "button", title: d,
      onclick: () => { tutorMode = k; turns = []; $("#chatlog").innerHTML = ""; renderTutorModes(); toast("Modo: " + n); },
    }, n))
  );
}

$("#chatStop")?.addEventListener("click", () => tutorCtl?.abort());

$("#chatSend")?.addEventListener("click", async () => {
  const box = $<HTMLTextAreaElement>("#chatIn");
  const v = box.value.trim();
  if (!v) return;

  const log = $("#chatlog");
  log.append(el("div", { class: "msg u" }, v));
  box.value = "";
  const bubble = el("div", { class: "msg a" }, el("span", { class: "dots" }, "Pensando"));
  log.append(bubble);
  log.scrollTop = log.scrollHeight;

  turns.push({ role: "user", content: v });
  tutorCtl = new AbortController();
  const send = $<HTMLButtonElement>("#chatSend");
  send.disabled = true;

  try {
    const text = await streamAi("tutor", { mode: tutorMode, turns }, {
      signal: tutorCtl.signal,
      onText: t => { bubble.textContent = t; log.scrollTop = log.scrollHeight; },
    });
    turns.push({ role: "assistant", content: text });
    if (turns.length > 12) turns = turns.slice(-12);
    touchDay();
  } catch (e: any) {
    turns.pop();
    bubble.textContent = e.text || "";
    if (e.code !== "cancelled") {
      bubble.append(el("div", { style: "margin-top:8px;color:var(--bad)" }, aiCopy(e)));
      if (needsAccount(e)) {
        bubble.append(el("div", { style: "margin-top:10px" },
          el("button", { class: "btn small", type: "button", onclick: () => go("cuenta") }, "Entrar con mi correo")));
      }
    }
  } finally {
    send.disabled = false;
    refreshAi();
  }
});

$("#chatIn")?.addEventListener("keydown", (e: KeyboardEvent) => {
  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) $<HTMLButtonElement>("#chatSend").click();
});
