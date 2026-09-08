import { S, save, touchDay } from "../state";
import { $, el, toast } from "../dom";
import { ask } from "../ai";
import { renderPanel } from "./panel";

export function renderErrors(){
  const list=$("#errList"); list.innerHTML="";
  if(!S.errors.length){ list.append(el("p",{class:"tiny"},"Aún no hay errores registrados. Añade el primero arriba.")); return; }
  [...S.errors].reverse().forEach(e=>{
    list.append(el("div",{class:"card"},
      el("div",{class:"row",style:"justify-content:space-between"},
        el("span",{class:"chip warn"},e.cat), el("span",{class:"tiny"},e.d)),
      el("p",{class:"en",style:"margin-top:8px"},e.text),
      e.fix? el("div",{class:"explain",style:"margin-top:10px;white-space:pre-wrap"},e.fix):null,
      el("div",{class:"row",style:"margin-top:10px"},
        el("button",{class:"btn ghost small",type:"button",onclick:()=>{
          S.errors=S.errors.filter(x=>x.id!==e.id); save(); renderErrors(); renderPanel();
        }},"Ya no lo fallo"))));
  });
}
$("#errAdd").onclick=()=>{
  const v=$<HTMLTextAreaElement>("#errIn").value.trim(); if(!v){ toast("Escribe la frase primero"); return; }
  S.errors.push({id:Date.now(),text:v,cat:$<HTMLSelectElement>("#errCat").value,d:new Date().toISOString().slice(0,10)});
  $<HTMLTextAreaElement>("#errIn").value=""; save(); touchDay(); renderErrors(); renderPanel(); toast("Guardado en el cuaderno");
};
$("#errFix").onclick=(ev: any)=>{
  const v=$<HTMLTextAreaElement>("#errIn").value.trim();
  if(!v){ toast("Escribe la frase primero"); return; }
  ask("error", { category: $<HTMLSelectElement>("#errCat").value, text: v }, $("#errFb"), ev.target);
};
