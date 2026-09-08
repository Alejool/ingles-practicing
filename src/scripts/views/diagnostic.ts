import { S, save, touchDay, P } from "../state";
import { $, el, esc, toast } from "../dom";
import { T, setTrack } from "../track";
import { levelLabelData, setOpenDay } from "../progress";
import { renderPanel } from "./panel";
import { go } from "../nav";

export function renderDiag(){
  const list=$("#diagList"); list.innerHTML="";
  T().diag.forEach((it,idx)=>{
    const picked=P().diag.answers[it.id];
    const shown=P().diag.done;
    const ok = picked===it.a;
    const sheet=el("div",{class:"sheet","data-state": shown? (ok?"ok":"bad"):""},
      el("div",{class:"margin"},
        el("span",{class:"qn"},String(idx+1).padStart(2,"0")),
        el("span",{class:"glyph"}, shown? (ok?"✓":"✗") : "")),
      el("div",{class:"body"},
        el("div",{class:"row",style:"gap:6px;margin-bottom:7px"},
          el("span",{class:"chip"},it.area), el("span",{class:"chip a"},it.lvl)),
        el("div",{class:"qtext",html:esc(it.q).replace(/___/g,'<span class="hl">______</span>')}),
        el("div",{class:"opts"}, it.opts.map((o,i)=>el("button",{
          class:"opt",type:"button","data-pick": picked===i?"1":null,
          "data-res": shown? (i===it.a?"ok": (picked===i?"bad":null)) : null,
          disabled: shown? "" : null,
          onclick:()=>{ if(P().diag.done) return; P().diag.answers[it.id]=i; save(); renderDiag(); }
        }, el("span",{class:"k"}, "ABCD"[i]), el("span",{},o)))),
        shown? el("div",{class:"explain"}, el("span",{class:"tag"},"Por qué"), el("span",{html:it.exp})) : null));
    list.append(sheet);
  });
  const n=Object.keys(P().diag.answers).length;
  const total = T().diag.length;
  $("#diagCount").textContent = n+" / "+total+" respondidas";
  $<HTMLButtonElement>("#diagCheck").disabled = n<total || P().diag.done;
  if(P().diag.done) renderDiagResult();
}
export function renderDiagResult(){
  const box=$("#diagResult"); box.innerHTML="";
  const sc=P().diag.score;
  const byArea: Record<string,{ok:number;n:number}> = {};
  T().diag.forEach(it=>{ const a=byArea[it.area]||(byArea[it.area]={ok:0,n:0}); a.n++; if(P().diag.answers[it.id]===it.a) a.ok++; });
  const weak=Object.entries(byArea).filter(([,v])=>v.ok/v.n<0.7).map(([k])=>k);
  const lv=levelLabelData();
  let start = sc.pct<50? 1 : sc.pct<65? 4 : sc.pct<78? 9 : 13;
  box.append(el("div",{class:"card"},
    el("span",{class:"eyebrow"},"Resultado"),
    el("h3",{style:"margin:4px 0 6px;font-size:26px"}, "Nivel estimado: "+lv.v+" · "+sc.right+"/"+T().diag.length+" ("+sc.pct+"%)"),
    el("p",{class:"small"}, sc.pct<50? "Base de B1 aún incompleta. El plan te sirve entero: no saltes el Bloque A."
      : sc.pct<65? "B1 razonable con agujeros claros. Empieza en la semana 4 y no descuides las áreas rojas."
      : sc.pct<78? "B1 sólido, entrando en B2. Empieza en la semana 9; el salto está en producción, no en comprensión."
      : "B2 en marcha. Empieza en la semana 13 y prioriza precisión, léxico preciso y formato de examen."),
    el("div",{class:"row",style:"margin-top:12px"},
      el("span",{class:"chip a"},"Empieza en la semana "+start),
      ...weak.slice(0,6).map(w=>el("span",{class:"chip bad"},w))),
    otraRuta(sc.pct),
    el("div",{class:"row",style:"margin-top:12px"},
      // Colocar de verdad: saltar a ese día, no solo recomendarlo.
      el("button",{class:"btn",type:"button",onclick:()=>{
        setOpenDay((start-1)*5+1); go("plan");
        toast("Te dejo en el día "+((start-1)*5+1)+", que es donde te toca empezar");
      }},"Empezar en la semana "+start),
      el("button",{class:"btn ghost",type:"button",onclick:()=>go("plan")},"Abrir el plan desde el principio"),
      el("button",{class:"btn ghost",type:"button",onclick:()=>{
        P().diag={answers:{},done:false,score:null}; save(); renderDiag(); $("#diagResult").innerHTML=""; toast("Diagnóstico reiniciado");
      }},"Repetir diagnóstico"))));
}
$("#diagStart").onclick=()=>{ if(P().diag.done){ P().diag={answers:{},done:false,score:null}; save(); $("#diagResult").innerHTML=""; } renderDiag(); toast("Responde las "+T().diag.length+" preguntas"); };
$("#diagCheck").onclick=()=>{
  let right=0; T().diag.forEach(it=>{ if(P().diag.answers[it.id]===it.a) right++; });
  P().diag.done=true; P().diag.score={right,pct:Math.round(right/T().diag.length*100)};
  P().stats.diag={ok:right,n:T().diag.length}; save(); touchDay();
  renderDiag(); renderPanel(); window.scrollTo({top:0,behavior:"smooth"});
};

/**
 * Si el resultado se sale por arriba o por abajo, la ruta elegida no es la suya:
 * mejor decirlo aquí que dejar a alguien meses en el sitio equivocado.
 */
function otraRuta(pct: number): HTMLElement | null {
  const esA2 = S.track === "a2b1";
  if (esA2 && pct >= 88) {
    return el("div", { class: "explain", style: "margin-top:12px;border-left-color:var(--ok);background:var(--ok-soft)" },
      el("span", { class: "tag" }, "Se te queda corta"),
      el("span", {}, "Con este resultado la ruta A2 → B1 te va a aburrir. "),
      el("button", {
        class: "btn small", style: "margin-left:8px", type: "button",
        onclick: () => { setTrack("b1b2").then(() => go("diag")).catch(e => toast(e.message)); },
      }, "Cambiar a B1 → B2"));
  }
  if (!esA2 && pct < 40) {
    return el("div", { class: "explain", style: "margin-top:12px;border-left-color:var(--warn);background:var(--warn-soft)" },
      el("span", { class: "tag" }, "Vas a sufrir de más" ),
      el("span", {}, "Con menos del 40% en B1 → B2 conviene afianzar la base antes. "),
      el("button", {
        class: "btn small", style: "margin-left:8px", type: "button",
        onclick: () => { setTrack("a2b1").then(() => go("diag")).catch(e => toast(e.message)); },
      }, "Cambiar a A2 → B1"));
  }
  return null;
}
