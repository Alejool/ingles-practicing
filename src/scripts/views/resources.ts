import { $, el } from "../dom";
import { T } from "../track";

export function renderRes(){
  const out=$("#resOut"); out.innerHTML="";
  out.append(el("p",{class:"lede",style:"margin-bottom:18px"},"Poco material y usado a fondo rinde más que mucho material hojeado. Elige uno de cada bloque y no lo cambies hasta terminarlo."));
  T().resources.forEach(g=>{
    out.append(el("div",{class:"card",style:"margin-bottom:12px"},
      el("span",{class:"eyebrow"},g.t),
      el("div",{style:"margin-top:10px"}, g.items.map(([n,d])=>el("div",{style:"padding:9px 0;border-bottom:1px solid var(--line)"},
        el("div",{style:"font-weight:600;font-size:14.5px"},n), el("div",{class:"tiny",style:"margin-top:2px"},d))))));
  });
  out.append(el("div",{class:"card"},
    el("span",{class:"eyebrow"},"Regla de oro"),
    el("h3",{style:"margin:4px 0 8px"},"Producir antes que consumir"),
    el("p",{class:"small"},"Si en una sesión de 50 minutos no has escrito ni dicho nada en inglés, no has estudiado: has leído sobre inglés. La proporción que funciona es dos tercios de entrada y un tercio de producción, todos los días, sin excepción.")));
}
