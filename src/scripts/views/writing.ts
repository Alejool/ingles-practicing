import { S, save, P } from "../state";
import { $, $$, el, toast, words, rangeOf } from "../dom";
import { T } from "../track";

import { ask, aiNote } from "../ai";
import { takeIntent } from "../intent";
import { tallyMax, tally, marcarActividad } from "../progress";

export let wrSel="wr1";
export function renderWriting(){
  const intent = takeIntent("writing");
  if (intent?.task && T().writing.some(w => w.id === intent.task)) wrSel = intent.task;
  if (!T().writing.some(w => w.id === wrSel)) wrSel = T().writing[0].id;
  const t=$("#wrTabs"); t.innerHTML="";
  T().writing.forEach(w=>t.append(el("button",{class:"btn "+(w.id===wrSel?"":"ghost")+" small",type:"button",onclick:()=>{wrSel=w.id;renderWriting();}},
    el("span",{},w.name), el("span",{class:"chip",style:"margin-left:4px"},w.lvl))));
  const w=T().writing.find(x=>x.id===wrSel), out=$("#wrOut"); out.innerHTML="";
  const rec=P().writing[w.id]||(P().writing[w.id]={text:"",chk:{}});
  out.append(el("div",{class:"card"},
    el("div",{class:"row",style:"gap:6px"},el("span",{class:"chip a"},w.lvl),el("span",{class:"chip"},w.words+" palabras"),el("span",{class:"chip"},w.time)),
    el("h2",{class:"h-sec",style:"margin-top:10px;font-size:24px"},w.name),
    el("pre",{style:"white-space:pre-wrap;font-family:var(--f-display);font-size:16.5px;line-height:1.6;margin-top:10px;color:var(--ink)"},w.prompt)));
  out.append(el("div",{class:"grid g2",style:"margin-top:12px"},
    el("div",{class:"card"},el("span",{class:"eyebrow"},"Plan en 5 minutos"),
      el("ol",{style:"margin:8px 0 0;padding-left:18px"},w.plan.map(p=>el("li",{class:"small",style:"margin-bottom:4px"},p)))),
    el("div",{class:"card"},el("span",{class:"eyebrow"},"Banco de frases"),
      el("ul",{style:"margin:8px 0 0;padding-left:18px"},w.phr.map(p=>el("li",{class:"small",style:"margin-bottom:4px;font-family:var(--f-display);font-size:15px"},p))))));

  const ta=el("textarea",{id:"wrText",placeholder:"Write your answer here…"});
  ta.value=rec.text;
  const count=el("span",{class:"chip"},"0 palabras");
  function upd(){ const n=words(ta.value); const [lo,hi]=rangeOf(w.words);
    count.textContent=n+" palabras"; count.className="chip"+(n<lo?" bad":(hi&&n>hi?" warn":" ok"));
    // El reto de palabras mira el texto más largo del día, no la suma de tecleos.
    tallyMax("words", n); }
  ta.addEventListener("input",()=>{ rec.text=ta.value; save(); marcarActividad(); upd(); });
  const fb=el("div",{style:"margin-top:14px"});
  const btnFix=el("button",{class:"btn",type:"button","data-ai":"1",onclick:()=>{
    if(!ta.value.trim()){ toast("Escribe algo primero"); return; }
    tally("corrections");
    ask("writing", { task:w.name, level:w.lvl, words:w.words, brief:w.prompt, answer:ta.value }, fb, btnFix);
  }},"Corregir con IA");
  const btnModel=el("button",{class:"btn ghost",type:"button",onclick:()=>{
    const box=$("#wrModel"); box.classList.toggle("hidden");
    btnModel.textContent = box.classList.contains("hidden")? "Ver respuesta modelo":"Ocultar modelo";
  }},"Ver respuesta modelo");
  out.append(el("div",{class:"card",style:"margin-top:12px"},
    el("div",{class:"row",style:"justify-content:space-between;margin-bottom:8px"},
      el("span",{class:"eyebrow"},"Tu respuesta"), count),
    ta,
    el("div",{class:"row",style:"margin-top:12px"}, btnFix, btnModel,
      el("button",{class:"btn ghost small",type:"button",onclick:()=>{ if(confirm("¿Borrar tu texto?")){ rec.text=""; ta.value=""; save(); upd(); } }},"Limpiar")),
    aiNote(),
    fb));
  out.append(el("div",{class:"grid g2",style:"margin-top:12px"},
    el("div",{class:"card"},el("span",{class:"eyebrow"},"Lista de control · autoevaluación"),
      el("div",{style:"margin-top:8px"}, w.chk.map((c,i)=>el("label",{class:"task"+(rec.chk[i]?" done":"")},
        el("input",{type:"checkbox",checked:rec.chk[i]?"":null,onchange:e=>{rec.chk[i]=e.target.checked;save();renderWriting();}}),
        el("span",{},c))))),
    el("div",{class:"card"},el("span",{class:"eyebrow"},"Cómo se puntúa"),
      el("div",{style:"margin-top:8px"}, T().rubric.map(([n,d])=>el("div",{style:"margin-bottom:9px"},
        el("div",{style:"font-weight:600;font-size:14px"},n), el("div",{class:"tiny"},d)))))));
  const model=el("div",{class:"card hidden",id:"wrModel",style:"margin-top:12px"},
    el("span",{class:"eyebrow"},"Respuesta modelo · nivel alto"),
    el("pre",{style:"white-space:pre-wrap;font-family:var(--f-display);font-size:16.5px;line-height:1.7;margin-top:10px"},w.model),
    el("p",{class:"tiny",style:"margin-top:10px"},"No la memorices: subraya las estructuras que tú no habrías usado y reescribe tu texto con dos de ellas."));
  out.append(model);
  upd();
}
