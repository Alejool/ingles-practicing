/**
 * Voz del navegador.
 *
 * `speechSynthesis` viene de serie en todos los navegadores modernos y no
 * cuesta nada, así que sirve para lo que a esta app le faltaba: oír cómo suena
 * una palabra, escuchar un texto y, sobre todo, el dictado inverso —la app lee
 * y tú escribes—, que es el mejor ejercicio de comprensión oral que se puede
 * montar sin ficheros de audio.
 *
 * Se prefiere una voz británica; si no hay, cualquier voz inglesa; si no hay
 * ninguna, la app avisa y sigue funcionando sin audio.
 */

export function hayVoz(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

let vocesCache: SpeechSynthesisVoice[] = [];

/**
 * Las voces tardan un momento en aparecer y en algunos navegadores llegan por
 * evento, así que se espera a que estén antes de hablar por primera vez.
 */
export function vocesInglesas(): Promise<SpeechSynthesisVoice[]> {
  if (!hayVoz()) return Promise.resolve([]);
  const filtrar = (vs: SpeechSynthesisVoice[]) => vs.filter(v => /^en(-|_|$)/i.test(v.lang));
  const ya = filtrar(speechSynthesis.getVoices());
  if (ya.length) { vocesCache = ya; return Promise.resolve(ya); }
  return new Promise(res => {
    let listo = false;
    const acabar = () => {
      if (listo) return;
      listo = true;
      vocesCache = filtrar(speechSynthesis.getVoices());
      res(vocesCache);
    };
    speechSynthesis.addEventListener("voiceschanged", acabar, { once: true });
    // Si el evento no llega (pasa en algún Safari), no dejamos la promesa colgada.
    setTimeout(acabar, 1200);
  });
}

/** La voz preferida: británica si la hay, si no cualquier inglesa. */
function mejorVoz(preferida?: string): SpeechSynthesisVoice | null {
  const vs = vocesCache;
  if (!vs.length) return null;
  if (preferida) {
    const exacta = vs.find(v => v.voiceURI === preferida || v.name === preferida);
    if (exacta) return exacta;
  }
  return vs.find(v => /en-GB/i.test(v.lang)) || vs.find(v => /en-US/i.test(v.lang)) || vs[0];
}

export interface HablarOpts {
  /** 0.5 lento, 1 normal. El dictado suele ir a 0.85. */
  rate?: number;
  voz?: string;
  onFin?: () => void;
  onError?: (motivo: string) => void;
}

let ultimo: SpeechSynthesisUtterance | null = null;

/** Lee un texto en voz alta. Corta lo que estuviera sonando. */
export async function hablar(texto: string, opts: HablarOpts = {}): Promise<void> {
  if (!hayVoz() || !texto.trim()) { opts.onError?.("Este navegador no puede hablar."); return; }
  await vocesInglesas();
  callar();

  const u = new SpeechSynthesisUtterance(texto);
  const v = mejorVoz(opts.voz);
  if (v) { u.voice = v; u.lang = v.lang; } else { u.lang = "en-GB"; }
  u.rate = opts.rate ?? 1;
  u.pitch = 1;
  u.onend = () => { ultimo = null; opts.onFin?.(); };
  u.onerror = e => {
    ultimo = null;
    // Cancelar a propósito dispara un error: eso no es un fallo que contar.
    if ((e as SpeechSynthesisErrorEvent).error === "canceled" || (e as SpeechSynthesisErrorEvent).error === "interrupted") return;
    opts.onError?.("No se pudo reproducir el audio.");
    opts.onFin?.();
  };
  ultimo = u;
  speechSynthesis.speak(u);
}

export function callar(): void {
  if (!hayVoz()) return;
  try { speechSynthesis.cancel(); } catch { /* ya estaba parado */ }
  ultimo = null;
}

export function hablando(): boolean {
  return hayVoz() && (speechSynthesis.speaking || speechSynthesis.pending);
}

/* ─────────────── corrección de un dictado ─────────────── */

export interface Palabra {
  texto: string;
  estado: "bien" | "mal" | "falta" | "sobra";
  esperada?: string;
}

export interface Correccion {
  palabras: Palabra[];
  aciertos: number;
  total: number;
  pct: number;
}

/** Quita puntuación y mayúsculas: el dictado juzga las palabras, no las comas. */
function limpiar(s: string): string[] {
  return s.toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9'\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Compara lo que escribiste con lo que se dictó, palabra a palabra.
 *
 * Es una alineación tipo diff (la subsecuencia común más larga), así que si te
 * saltas una palabra el resto no se descoloca y sigue marcándose bien.
 */
export function corregirDictado(original: string, escrito: string): Correccion {
  const a = limpiar(original);
  const b = limpiar(escrito);

  // Tabla de la subsecuencia común más larga.
  const n = a.length;
  const m = b.length;
  const L: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    }
  }

  const palabras: Palabra[] = [];
  let i = 0;
  let j = 0;
  let aciertos = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      palabras.push({ texto: b[j], estado: "bien" });
      aciertos++;
      i++; j++;
    } else if (L[i + 1][j] >= L[i][j + 1]) {
      palabras.push({ texto: a[i], estado: "falta" });
      i++;
    } else {
      palabras.push({ texto: b[j], estado: "sobra" });
      j++;
    }
  }
  while (i < n) { palabras.push({ texto: a[i], estado: "falta" }); i++; }
  while (j < m) { palabras.push({ texto: b[j], estado: "sobra" }); j++; }

  return { palabras, aciertos, total: n, pct: n ? Math.round((aciertos / n) * 100) : 0 };
}
