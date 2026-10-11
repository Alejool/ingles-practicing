/**
 * Un diálogo modal sobre el `<dialog>` nativo.
 *
 * `showModal()` pone la trampa de foco, deja inerte lo de detrás y sube la caja
 * a la capa superior, así que también se ve encima de una tanda a pantalla
 * completa. Aquí solo se añade lo que el elemento no trae: nombre accesible,
 * foco al título al abrir, que Escape pregunte antes de cerrar y que el foco
 * vuelva a quien lo abrió.
 */

import { el } from "./dom";

export interface Dialogo {
  raiz: HTMLDialogElement;
  /** Donde pinta quien lo abre. El título va aparte, encima. */
  cuerpo: HTMLElement;
  cerrar(): void;
}

export function abrirDialogo(o: {
  titulo: string;
  idTitulo: string;
  describeId?: string;
  /** Escape y el botón atrás del móvil pasan por aquí. `false` = no cerrar. */
  alCancelar: () => boolean;
  /** A dónde vuelve el foco. Una función si el botón puede haberse repintado. */
  volverA: HTMLElement | (() => HTMLElement | null);
  clase?: string;
}): Dialogo {
  const titulo = el("h2", { id: o.idTitulo, class: "dlg-t", tabindex: "-1" }, o.titulo);
  const cuerpo = el("div", { class: "dlg-cuerpo" });
  const raiz = el("dialog", {
    class: o.clase ? "dlg " + o.clase : "dlg",
    "aria-labelledby": o.idTitulo,
    "aria-describedby": o.describeId,
  }, titulo, cuerpo);
  const modal = typeof raiz.showModal === "function";

  const cerrar = (): void => {
    if (!raiz.isConnected) return;
    if (modal && raiz.open) raiz.close();
    raiz.remove();
    (typeof o.volverA === "function" ? o.volverA() : o.volverA)?.focus();
  };
  const cancelar = (e: Event): void => {
    e.preventDefault();
    if (o.alCancelar()) cerrar();
  };

  // Si el navegador lo cierra por su cuenta, se recoge igual.
  raiz.addEventListener("close", cerrar);

  document.body.append(raiz);
  if (modal) {
    // Escape y el gesto de atrás llegan como `cancel`.
    raiz.addEventListener("cancel", cancelar);
    raiz.showModal();
  } else {
    // Navegador sin `showModal`: la misma caja, a la vista y sin modalidad.
    raiz.setAttribute("role", "dialog");
    raiz.classList.add("dlg-enlinea");
    raiz.addEventListener("keydown", e => { if (e.key === "Escape") cancelar(e); });
  }
  titulo.focus();

  return { raiz, cuerpo, cerrar };
}
