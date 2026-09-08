import { S, save, touchDay, P } from "../state";
import { $, el, esc, norm, pct, fmt } from "../dom";
import { T } from "../track";
import { renderPanel } from "./panel";

export let mockAns: Record<number, any> = {};
let mockRunning=false;
let mockT: ReturnType<typeof setInterval> | null = null;
let mockLeft=40*60;
export function renderMockBlank(){
  const out=$("#mockOut"); out.innerHTML="";
  if(!mockRunning){
    out.append(el("div",{class:"card"},
      el("span",{class:"eyebrow"},"Antes de empezar"),
      el("h3",{style:"margin:4px 0 8px"},"Reglas del simulacro"),
      el("ul",{style:"margin:0;padding-left:18px"},[
        "40 minutos para 32 ítems. El reloj no se para.",
        "Nada de diccionario, traductor ni pestañas abiertas.",
        "Si no sabes un ítem, responde igualmente: no hay penalización por error.",
        "La corrección llega al entregar o cuando se acabe el tiempo, no antes.",
        "Cuatro partes: multiple-choice cloze, open cloze, word formation y transformaciones."
      ].map(x=>el("li",{class:"small",style:"margin-bottom:5px"},x))),
      P().mock.history.length? el("div",{style:"margin-top:14px"},
        el("span",{class:"eyebrow"},"Historial"),
        el("div",{class:"tblwrap",style:"margin-top:8px"},el("table",{},
          el("thead",{},el("tr",{},el("th",{},"Fecha"),el("th",{},"Aciertos"),el("th",{},"Escala Cambridge"))),
          el("tbody",{},P().mock.history.slice(-8).reverse().map(h=>
            el("tr",{},el("td",{},h.d),el("td",{class:"num"},h.s+"/32"),el("td",{class:"num"},String(h.cs)))))))) : null));
  }
}
export function mockItems(){
  return [...T().mock.p1.items.map(i=>({...i,part:1})), ...T().mock.p2.items.map(i=>({...i,part:2})),
          ...T().mock.p3.items.map(i=>({...i,part:3})), ...T().mock.p4.items.map(i=>({...i,part:4}))];
}
export function renderMock(reveal){
  const out=$("#mockOut"); out.innerHTML="";
  /* Parte 1 */
  const p1=el("div",{class:"card"},el("span",{class:"eyebrow"},T().mock.p1.title),el("p",{class:"tiny",style:"margin:4px 0 12px"},T().mock.p1.intro));
  const t1=el("p",{class:"en",style:"line-height:2.2;max-width:68ch"});
  T().mock.p1.text.forEach(part=>{
    if(typeof part==="string"){ t1.append(document.createTextNode(part)); return; }
    t1.append(el("span",{class:"chip a",style:"font-family:var(--f-mono)"}, "("+part.n+")"));
  });
  p1.append(t1);
  T().mock.p1.items.forEach(it=>{
    const sel=mockAns[it.n];
    p1.append(el("div",{class:"sheet","data-state": reveal? (sel===it.a?"ok":"bad"):"" ,style:"margin-top:10px"},
      el("div",{class:"margin"},el("span",{class:"qn"},String(it.n)),el("span",{class:"glyph"},reveal?(sel===it.a?"✓":"✗"):"")),
      el("div",{class:"body"},
        el("div",{class:"opts"}, it.o.map((o,j)=>el("button",{class:"opt",type:"button",
          "data-pick": sel===j?"1":null,
          "data-res": reveal? (j===it.a?"ok":(sel===j?"bad":null)):null,
          disabled: reveal?"":null,
          onclick:()=>{ mockAns[it.n]=j; updMockCount(); renderMock(false); }},
          el("span",{class:"k"},"ABCD"[j]),el("span",{},o)))),
        reveal? el("div",{class:"explain"},el("span",{class:"tag"},"Ítem "+it.n),el("span",{html:it.e})):null)));
  });
  out.append(p1);
  /* Parte 2 */
  const p2=el("div",{class:"card",style:"margin-top:12px"},el("span",{class:"eyebrow"},T().mock.p2.title),el("p",{class:"tiny",style:"margin:4px 0 12px"},T().mock.p2.intro));
  const t2=el("p",{class:"en",style:"line-height:2.3;max-width:68ch"});
  T().mock.p2.text.forEach(part=>{
    if(typeof part==="string"){ t2.append(document.createTextNode(part)); return; }
    const it=T().mock.p2.items.find(x=>x.n===part.n);
    const inp=el("input",{type:"text",style:"width:118px;display:inline-block;text-align:center",placeholder:"("+part.n+")",
      value:mockAns[part.n]||"",autocomplete:"off",spellcheck:"false",disabled:reveal?"":null,
      oninput:e=>{ mockAns[part.n]=e.target.value; updMockCount(); }});
    if(reveal) inp.style.borderColor = it.a.some(a=>norm(a)===norm(mockAns[part.n]))? "var(--ok)":"var(--bad)";
    t2.append(inp);
  });
  p2.append(t2);
  if(reveal) T().mock.p2.items.forEach(it=>{
    const ok=it.a.some(a=>norm(a)===norm(mockAns[it.n]));
    p2.append(el("div",{class:"explain",style:"margin-top:8px"+(ok?";border-left-color:var(--ok);background:var(--ok-soft)":""),},
      el("span",{class:"tag"},"Hueco "+it.n+" · "+it.a[0]),el("span",{html:it.e})));
  });
  out.append(p2);
  /* Parte 3 */
  const p3=el("div",{class:"card",style:"margin-top:12px"},el("span",{class:"eyebrow"},T().mock.p3.title),el("p",{class:"tiny",style:"margin:4px 0 12px"},T().mock.p3.intro));
  T().mock.p3.items.forEach(it=>{
    const ok=reveal && it.a.some(a=>norm(a)===norm(mockAns[it.n]));
    p3.append(el("div",{class:"sheet","data-state": reveal? (ok?"ok":"bad"):"",style:"margin-top:10px"},
      el("div",{class:"margin"},el("span",{class:"qn"},String(it.n)),el("span",{class:"glyph"},reveal?(ok?"✓":"✗"):"")),
      el("div",{class:"body"},
        el("div",{class:"row",style:"justify-content:space-between;gap:10px;margin-bottom:10px"},
          el("span",{class:"en",style:"flex:1",html:esc(it.s).replace(/_+/g,'<span class="hl">'+"&nbsp;".repeat(14)+'</span>')}),
          el("span",{class:"chip a"},it.root)),
        el("input",{type:"text",placeholder:"Tu respuesta…",value:mockAns[it.n]||"",disabled:reveal?"":null,
          autocomplete:"off",spellcheck:"false",oninput:e=>{mockAns[it.n]=e.target.value;updMockCount();}}),
        reveal? el("div",{class:"explain",style:"margin-top:10px"},el("span",{class:"tag"},"Respuesta · "+it.a[0]),el("span",{html:it.e})):null)));
  });
  out.append(p3);
  /* Parte 4 */
  const p4=el("div",{class:"card",style:"margin-top:12px"},el("span",{class:"eyebrow"},T().mock.p4.title),el("p",{class:"tiny",style:"margin:4px 0 12px"},T().mock.p4.intro));
  T().mock.p4.items.forEach(it=>{
    const ok=reveal && it.a.some(a=>norm(a)===norm(mockAns[it.n]));
    p4.append(el("div",{class:"sheet","data-state": reveal? (ok?"ok":"bad"):"",style:"margin-top:10px"},
      el("div",{class:"margin"},el("span",{class:"qn"},String(it.n)),el("span",{class:"glyph"},reveal?(ok?"✓":"✗"):"")),
      el("div",{class:"body"},
        el("div",{class:"en",style:"margin-bottom:8px"},it.s1),
        el("div",{class:"row",style:"margin-bottom:8px"},el("span",{class:"chip a"},it.key)),
        el("div",{class:"en",style:"margin-bottom:10px",html:esc(it.s2).replace(/_+/g,'<span class="hl">'+"&nbsp;".repeat(22)+'</span>')}),
        el("input",{type:"text",placeholder:"2–5 palabras…",value:mockAns[it.n]||"",disabled:reveal?"":null,
          autocomplete:"off",spellcheck:"false",oninput:e=>{mockAns[it.n]=e.target.value;updMockCount();}}),
        reveal? el("div",{class:"explain",style:"margin-top:10px"},el("span",{class:"tag"},"Respuesta · "+it.a[0]),el("span",{html:it.e})):null)));
  });
  out.append(p4);
}
export function updMockCount(){
  const n=Object.values(mockAns).filter(v=>v!==undefined&&String(v).trim()!=="").length;
  $("#mockCount").textContent=n+" / 32";
}
$("#mockStart").onclick=()=>{
  mockAns={}; mockRunning=true; mockLeft=40*60;
  $("#mockResult").innerHTML=""; $<HTMLButtonElement>("#mockSubmit").disabled=false; $<HTMLButtonElement>("#mockStart").disabled=true;
  renderMock(false); updMockCount(); tickMock();
  mockT=setInterval(tickMock,1000); touchDay();
};
export function tickMock(){
  const t=$("#mockTimer"); t.textContent=fmt(Math.max(0,mockLeft));
  t.classList.toggle("hot", mockLeft<=300);
  if(mockLeft<=0){ submitMock(true); return; }
  mockLeft--;
}
$("#mockSubmit").onclick=()=>submitMock(false);
export function submitMock(auto){
  if(!mockRunning) return;
  clearInterval(mockT); mockRunning=false;
  $<HTMLButtonElement>("#mockSubmit").disabled=true; $<HTMLButtonElement>("#mockStart").disabled=false;
  let score=0; const byPart={1:0,2:0,3:0,4:0};
  mockItems().forEach(it=>{
    const v=mockAns[it.n];
    const item = it as any;
    const ok = item.o ? (v === item.a) : ((item.a || []) as string[]).some(a => norm(a) === norm(v));
    if(ok){ score++; byPart[it.part]++; }
  });
  const p=pct(score,32), cs=Math.round(120+p*0.8);
  const lvl = cs<140? "por debajo de B1" : cs<160? "B1" : cs<180? "B2" : "C1";
  P().mock.history.push({d:new Date().toISOString().slice(0,10),s:score,cs});
  P().mock.best = P().mock.best===null? score : Math.max(P().mock.best,score);
  P().stats.mock={ok:(P().stats.mock?.ok||0)+score, n:(P().stats.mock?.n||0)+32};
  save(); renderPanel();
  const res=$("#mockResult"); res.innerHTML="";
  res.append(el("div",{class:"card"},
    auto? el("span",{class:"chip bad"},"Se acabó el tiempo"):null,
    el("h3",{style:"font-size:27px;margin:6px 0"}, score+" / 32 · "+p+"% · escala "+cs+" ("+lvl+")"),
    el("p",{class:"small"}, p>=80? "Nivel de aprobado holgado en Reading & Use of English. Trabaja ahora Writing y Speaking, que es donde se pierden los B2."
      : p>=65? "Estás en la franja de aprobado justo. El margen está en la parte 4: las transformaciones son las que más suben la nota con menos horas."
      : p>=45? "Todavía por debajo del corte. Vuelve a los módulos 04 y 06 antes de repetir el simulacro."
      : "Muy por debajo. No repitas simulacros todavía: la mejora vendrá de gramática y vocabulario, no de más exámenes."),
    el("div",{class:"grid g3",style:"margin-top:14px"},
      ([["Parte 1 · Cloze múltiple",byPart[1]],["Parte 2 · Open cloze",byPart[2]],["Parte 3 · Word formation",byPart[3]],["Parte 4 · Transformaciones",byPart[4]]] as Array<[string, number]>)
      .map(([n,v])=>el("div",{class:"tile"},el("span",{class:"l"},n),el("span",{class:"v"},v+"/8"),
        el("span",{class:"tiny"}, v>=6?"Sólido": v>=4?"Justo":"Prioridad")))),
    el("p",{class:"tiny",style:"margin-top:12px"},"La escala es una estimación orientativa a partir del porcentaje de aciertos, no una nota oficial de Cambridge.")));
  renderMock(true);
  window.scrollTo({top:0,behavior:"smooth"});
}
