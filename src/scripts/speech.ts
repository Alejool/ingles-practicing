/**
 * Dictado del navegador.
 *
 * Chrome y Edge traen reconocimiento de voz de serie (Web Speech API) y no
 * cuesta nada usarlo: hablas y sale la transcripción. Firefox y Safari no lo
 * tienen, así que la vista se queda en el modo de escribir a mano.
 */

type Rec = any;

function Motor(): any {
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function hayDictado(): boolean {
  return !!Motor();
}

export interface DictadoOpts {
  /** Texto ya cerrado más lo que se está diciendo ahora. */
  onText: (firme: string, provisional: string) => void;
  onFin: (motivo: string) => void;
  lang?: string;
}

export interface Dictado {
  parar: () => void;
  activo: () => boolean;
}

const MOTIVOS: Record<string, string> = {
  "not-allowed": "El navegador no dio permiso para el micrófono. Actívalo en el candado de la barra de direcciones.",
  "service-not-allowed": "El navegador bloqueó el reconocimiento de voz. Prueba en Chrome o Edge.",
  "no-speech": "No se oyó nada. Acerca el micrófono y vuelve a intentarlo.",
  "audio-capture": "No encuentro ningún micrófono conectado.",
  network: "El reconocimiento de voz necesita conexión y no la hay.",
  aborted: "",
};

/**
 * Arranca el dictado. Devuelve el mando para pararlo.
 *
 * El motor corta solo cada pocos segundos de silencio; aquí se reengancha para
 * que puedas hablar dos minutos seguidos sin que se pare a media frase.
 */
export function dictar(opts: DictadoOpts): Dictado | null {
  const M = Motor();
  if (!M) return null;

  let firme = "";
  let vivo = true;
  let rec: Rec = null;

  function arrancar(): void {
    rec = new M();
    rec.lang = opts.lang || "en-GB";
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onresult = (ev: any) => {
      let provisional = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const r = ev.results[i];
        const txt = r[0]?.transcript || "";
        if (r.isFinal) firme += (firme && !/\s$/.test(firme) ? " " : "") + txt.trim();
        else provisional += txt;
      }
      opts.onText(firme.trim(), provisional.trim());
    };

    rec.onerror = (ev: any) => {
      const motivo = MOTIVOS[ev?.error] ?? "El dictado se detuvo (" + (ev?.error || "desconocido") + ").";
      // Un silencio no es un fallo: se reengancha y sigue.
      if (ev?.error === "no-speech" && vivo) return;
      vivo = false;
      opts.onFin(motivo);
    };

    rec.onend = () => {
      if (!vivo) { opts.onFin(""); return; }
      // Corte automático del motor: volver a empezar sin perder lo dicho.
      try { rec.start(); } catch { vivo = false; opts.onFin(""); }
    };

    try { rec.start(); } catch { vivo = false; opts.onFin("No se pudo abrir el micrófono."); }
  }

  arrancar();

  return {
    parar(): void {
      vivo = false;
      try { rec?.stop(); } catch { /* ya estaba parado */ }
    },
    activo(): boolean { return vivo; },
  };
}

/* ─────────────── medidas locales, sin IA ─────────────── */

const RELLENO = ["um", "uh", "erm", "eh", "like", "you know", "i mean", "well", "so yeah", "how do you say"];

export interface Medidas {
  palabras: number;
  distintas: number;
  riqueza: number;
  relleno: number;
  repetidas: Array<[string, number]>;
  porMinuto: number | null;
}

/** Lo que se puede medir sin preguntarle a nadie: ritmo, muletillas, repeticiones. */
export function medir(texto: string, segundos: number | null): Medidas {
  const limpio = texto.toLowerCase().replace(/[^a-z'’\s]/g, " ");
  const palabras = limpio.split(/\s+/).filter(Boolean);
  const cuenta = new Map<string, number>();
  palabras.forEach(p => cuenta.set(p, (cuenta.get(p) || 0) + 1));

  let relleno = 0;
  RELLENO.forEach(f => {
    const re = new RegExp("\\b" + f.replace(/ /g, "\\s+") + "\\b", "g");
    relleno += (limpio.match(re) || []).length;
  });

  const VACIAS = new Set(["the", "a", "an", "and", "or", "but", "of", "to", "in", "on", "for", "is", "are", "was",
    "were", "it", "i", "you", "he", "she", "we", "they", "that", "this", "with", "as", "at", "be", "have", "has",
    "my", "your", "not", "do", "does", "did", "so", "very", "there", "then", "if", "would", "can", "will"]);
  const repetidas = [...cuenta.entries()]
    .filter(([w, n]) => n >= 3 && w.length > 3 && !VACIAS.has(w))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return {
    palabras: palabras.length,
    distintas: cuenta.size,
    riqueza: palabras.length ? Math.round((cuenta.size / palabras.length) * 100) : 0,
    relleno,
    repetidas,
    porMinuto: segundos && segundos > 5 ? Math.round((palabras.length / segundos) * 60) : null,
  };
}
