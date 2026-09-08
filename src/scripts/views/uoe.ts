import { S, save, P } from "../state";
import { $, $$, el, esc, norm } from "../dom";
import { T } from "../track";
import { takeIntent } from "../intent";
import { isGap } from "../../data/types";
import { bump } from "../progress";

export let uoeSel="trans";
let clozeIdx=0;
export function renderUoeTabs(){
  const t=$("#uoeTabs"); t.innerHTML="";
  [["trans","Transformaciones"],["cloze","Open cloze"],["wf","Word formation"]].forEach(([k,n])=>
    t.append(el("button",{class:"btn "+(k===uoeSel?"":"ghost")+" small",type:"button",onclick:()=>{uoeSel=k;renderUoe();}},n)));
}
export function answerRow(id: string, accepted: string[], expl: string, extra?: unknown){
  const rec=P().uoe[id];
  const wrap=el("div",{});
  const inp=el("input",{type:"text",placeholder:"Tu respuesta…",value:rec?rec.v:"" ,autocomplete:"off",spellcheck:"false"});
  const fb=el("div",{});
  function check(){
    const v=norm(inp.value);
    const ok=accepted.some(a=>norm(a)===v);
    P().uoe[id]={v:inp.value,ok}; save(); bump("uoe",ok);
    paint(ok);
  }
  function paint(ok){
    fb.innerHTML="";
    fb.append(el("div",{class:"explain",style:ok?"border-left-color:var(--ok);background:var(--ok-soft)":"border-left-color:var(--bad);background:var(--bad-soft)"},
      el("span",{class:"tag"}, ok? "Correcto":"Respuesta"),
      el("div",{class:"en",style:"margin-bottom:6px"}, accepted[0]),
      el("span",{html:expl})));
    wrap.closest(".sheet")?.setAttribute("data-state", ok?"ok":"bad");
    const g=wrap.closest(".sheet")?.querySelector(".glyph"); if(g) g.textContent = ok?"✓":"✗";
  }
  inp.addEventListener("keydown",e=>{ if(e.key==="Enter") check(); });
  wrap.append(el("div",{class:"row",style:"align-items:stretch"},
    el("span",{style:"flex:1;min-width:200px"},inp),
    el("button",{class:"btn small",type:"button",onclick:check},"Corregir")), fb);
  if(rec) paint(rec.ok);
  return wrap;
}
export function renderUoe(){
  const intent = takeIntent("uoe");
  if (intent?.set) uoeSel = intent.set;
  if (T().clozes.length <= clozeIdx) clozeIdx = 0;
  renderUoeTabs();
  const out=$("#uoeOut"); out.innerHTML="";
  if(uoeSel==="trans"){
    out.append(el("p",{class:"small",style:"margin-bottom:12px"},"Completa la segunda frase para que signifique lo mismo que la primera, usando la palabra clave. Entre dos y cinco palabras, y la palabra clave no se puede cambiar."));
    T().trans.forEach((t,i)=>{
      const rt=P().uoe["t:"+t.id];
      out.append(el("div",{class:"sheet","data-state":rt?(rt.ok?"ok":"bad"):""},
        el("div",{class:"margin"},el("span",{class:"qn"},String(i+1)),el("span",{class:"glyph"},rt?(rt.ok?"✓":"✗"):"")),
        el("div",{class:"body"},
          el("div",{class:"en",style:"margin-bottom:8px"},t.s1),
          el("div",{class:"row",style:"gap:8px;margin-bottom:8px"},el("span",{class:"chip a"},t.key)),
          el("div",{class:"en",style:"margin-bottom:10px",html:esc(t.s2).replace(/_+/g,'<span class="hl">'+"&nbsp;".repeat(24)+'</span>')}),
          answerRow("t:"+t.id,t.a,t.e))));
    });
  } else if(uoeSel==="cloze"){
    const sel=el("div",{class:"row",style:"margin-bottom:12px"});
    T().clozes.forEach((c,i)=>{
      const g=c.parts.filter(isGap);
      const hechos=g.filter(x=>P().uoe["c"+i+":"+x.g]).length;
      sel.append(el("button",{class:"btn "+(i===clozeIdx?"":"ghost")+" small",type:"button",onclick:()=>{clozeIdx=i;renderUoe();}},
        el("span",{},"Texto "+(i+1)),
        hechos? el("span",{class:"chip"+(hechos===g.length?" ok":""),style:"margin-left:4px"},hechos+"/"+g.length):null));
    });
    out.append(sel);
    out.append(el("div",{class:"card"},
      el("span",{class:"eyebrow"},"Open cloze · una palabra por hueco"),
      el("h3",{style:"margin:4px 0 10px"},T().clozes[clozeIdx].title),
      (()=>{
        const p=el("p",{class:"en",style:"line-height:2.1"});
        T().clozes[clozeIdx].parts.forEach(raw=>{
          if(!isGap(raw)){ p.append(document.createTextNode(raw)); return; }
          const part = raw;
          const id="c"+clozeIdx+":"+part.g;
          const rec=P().uoe[id];
          const inp=el("input",{type:"text",style:"width:120px;display:inline-block;text-align:center",value:rec?rec.v:"",placeholder:"("+part.g+")",autocomplete:"off",spellcheck:"false"});
          if(rec) inp.style.borderColor = rec.ok? "var(--ok)":"var(--bad)";
          inp.addEventListener("keydown",e=>{ if(e.key==="Enter") checkCloze(); });
          p.append(inp);
        });
        return p;
      })(),
      el("div",{class:"row",style:"margin-top:14px"},
        el("button",{class:"btn",type:"button",onclick:checkCloze},"Corregir los 12"),
        el("button",{class:"btn ghost",type:"button",onclick:()=>{ T().clozes[clozeIdx].parts.forEach(p=>{ if(isGap(p)) delete P().uoe["c"+clozeIdx+":"+p.g]; }); save(); renderUoe(); }},"Reiniciar")),
      el("div",{id:"clozeFb",style:"margin-top:14px"})));
    if(T().clozes[clozeIdx].parts.some(p=>isGap(p) && P().uoe["c"+clozeIdx+":"+p.g])) paintClozeFb();
  } else {
    out.append(el("p",{class:"small",style:"margin-bottom:12px"},"Transforma la palabra en MAYÚSCULAS para que encaje en el hueco."));
    T().wform.forEach((w,i)=>{
      const rw=P().uoe["w:"+w.id];
      out.append(el("div",{class:"sheet","data-state":rw?(rw.ok?"ok":"bad"):""},
        el("div",{class:"margin"},el("span",{class:"qn"},String(i+1)),el("span",{class:"glyph"},rw?(rw.ok?"✓":"✗"):"")),
        el("div",{class:"body"},
          el("div",{class:"row",style:"justify-content:space-between;gap:10px;margin-bottom:10px"},
            el("span",{class:"en",style:"flex:1",html:esc(w.s).replace(/_+/g,'<span class="hl">'+"&nbsp;".repeat(14)+'</span>')}),
            el("span",{class:"chip a"},w.root)),
          answerRow("w:"+w.id,w.a,w.e))));
    });
  }
}
export function checkCloze(){
  const inputs=$$<HTMLInputElement>("#uoeOut input[type=text]");
  const gaps=T().clozes[clozeIdx].parts.filter(isGap);
  let ok=0;
  gaps.forEach((g,i)=>{
    const v=norm(inputs[i].value);
    const good=g.a.some(a=>norm(a)===v);
    P().uoe["c"+clozeIdx+":"+g.g]={v:inputs[i].value,ok:good};
    inputs[i].style.borderColor = good? "var(--ok)":"var(--bad)";
    if(good) ok++; bump("uoe",good);
  });
  save(); paintClozeFb();
}
export function paintClozeFb(){
  const box=$("#clozeFb"); if(!box) return; box.innerHTML="";
  const gaps=T().clozes[clozeIdx].parts.filter(isGap);
  const ok=gaps.filter(g=>(P().uoe["c"+clozeIdx+":"+g.g]||{}).ok).length;
  box.append(el("div",{class:"row",style:"margin-bottom:10px"}, el("span",{class:"chip "+(ok>=10?"ok":ok>=7?"warn":"bad")}, ok+" / "+gaps.length+" correctas")));
  gaps.forEach(g=>{
    const r=P().uoe["c"+clozeIdx+":"+g.g]; if(!r) return;
    box.append(el("div",{class:"explain",style:r.ok?"border-left-color:var(--ok);background:var(--ok-soft);margin-top:6px":"margin-top:6px"},
      el("span",{class:"tag"},"Hueco "+g.g+" · "+g.a[0]), el("span",{html:g.e})));
  });
}
