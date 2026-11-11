/**
 * Bienvenida tras el primer diagnóstico, sin modelo (AC-25, rama sin IA).
 *
 * Con el resultado del diagnóstico y el plan de la ruta: nivel por área, los
 * tres puntos por los que empezar y qué toca hoy. Es plantilla, pero sale de
 * los datos del estudiante: dos diagnósticos distintos dan textos distintos.
 * Devuelve texto plano; quien lo pinte lo mete con `textContent`.
 */

import type { Banda, NotaArea, Puntuacion } from "./diag-muestra.ts";

export interface NivelArea extends NotaArea {
  texto: string;
}

export interface Bienvenida {
  niveles: NivelArea[];
  puntos: string[];
  hoy: { dia: number; semana: number; bloques: string[] };
  texto: string;
}

const BANDA: Record<Banda, string> = {
  debajo: "por debajo del nivel",
  nivel: "en el nivel",
  encima: "por encima del nivel",
};

function sinHtml(s: string): string {
  return s.replace(/<[^>]*>/g, "").replace(/[<>]/g, "").replace(/\s+/g, " ").trim();
}

/** "a", "a y b", "a, b y c". */
function lista(xs: string[]): string {
  return xs.length < 2 ? xs.join("") : xs.slice(0, -1).join(", ") + " y " + xs[xs.length - 1];
}

export function bienvenida(resultado: Puntuacion, dia: number, bloques: string[]): Bienvenida {
  const niveles = resultado.porArea.map(a => ({
    ...a,
    texto: sinHtml(a.area) + ": " + a.ok + " de " + a.n + ", " + BANDA[a.banda],
  }));

  // `sort` es estable: a igual acierto queda el orden del diagnóstico.
  const puntos = resultado.porArea
    .map(a => ({ area: sinHtml(a.area), pct: a.n ? a.ok / a.n : 0 }))
    .sort((x, y) => x.pct - y.pct)
    .slice(0, 3)
    .map(a => a.area);

  const titulos = bloques.map(sinHtml).filter(Boolean);
  const semana = Math.floor((dia - 1) / 5) + 1;

  const texto = [
    "Tu nivel por áreas: " + niveles.map(n => n.texto).join("; ") + ".",
    puntos.length ? "Empieza por " + lista(puntos) + "." : "",
    "Hoy toca el día " + dia + " (semana " + semana + ")" + (titulos.length ? ": " + lista(titulos) : "") + ".",
  ].filter(Boolean).join(" ");

  return { niveles, puntos, hoy: { dia, semana, bloques: titulos }, texto };
}
