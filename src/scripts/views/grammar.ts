import { S, save, P } from "../state";
import { $, el, esc } from "../dom";
import { T } from "../track";
import { bump } from "../progress";
import { takeIntent } from "../intent";

export let gramSel = "g1";
export function gramScore(u){
  const r=P().gram[u.id]||{};
  const done=Object.keys(r).length, ok=Object.values(r).filter(Boolean).length;
  return {done,ok,total:u.dr.length};
}
export function renderGramTabs(){
  const t=$("#gramTabs"); t.innerHTML="";
  T().grammar.forEach(u=>{
    const s=gramScore(u);
    const cls = s.done===0? "chip" : (s.ok===s.total? "chip ok" : s.ok/s.total>=0.75? "chip warn":"chip bad");
    t.append(el("button",{class:"btn "+(u.id===gramSel?"":"ghost")+" small",type:"button",onclick:()=>{gramSel=u.id;renderGram();}},
      el("span",{class:"mono",style:"opacity:.6;font-size:11px"},String(u.n).padStart(2,"0")),
      el("span",{},u.t),
      s.done? el("span",{class:cls,style:"margin-left:4px"},s.ok+"/"+s.total): null));
  });
}
export function renderGram(){
  // Un paso del plan puede pedir una unidad concreta.
  const intent = takeIntent("gram");
  if (intent?.unit && T().grammar.some(u => u.id === intent.unit)) gramSel = intent.unit;
  // Al cambiar de ruta, la unidad elegida puede no existir: se cae a la primera.
  if (!T().grammar.some(u => u.id === gramSel)) gramSel = T().grammar[0].id;
  renderGramTabs();
  const u=T().grammar.find(x=>x.id===gramSel), out=$("#gramOut"); out.innerHTML="";
  out.append(el("div",{class:"card"},
    el("div",{class:"row",style:"gap:6px"}, el("span",{class:"chip a"},"Unidad "+u.n), el("span",{class:"chip"},u.lvl)),
    el("h2",{class:"h-sec",style:"margin-top:8px;font-size:26px"},u.t),
    el("p",{class:"small",style:"margin-top:8px",html:u.rule}),
    el("div",{class:"explain",style:"margin-top:12px"}, el("span",{class:"tag"},"La trampa del hispanohablante"), el("span",{html:u.trap}))));
  out.append(el("h3",{class:"h-sec",style:"margin:22px 0 10px"},"Drills"));
  const rec = P().gram[u.id] || (P().gram[u.id]={});
  u.dr.forEach((d,i)=>{
    const answered = rec[i]!==undefined;
    const pickKey = "p"+i;
    const picked = rec[pickKey];
    out.append(el("div",{class:"sheet","data-state": answered? (rec[i]?"ok":"bad"):""},
      el("div",{class:"margin"}, el("span",{class:"qn"},String(i+1)), el("span",{class:"glyph"}, answered?(rec[i]?"✓":"✗"):"")),
      el("div",{class:"body"},
        el("div",{class:"qtext",html:esc(d.q).replace(/___/g,'<span class="hl">______</span>')}),
        el("div",{class:"opts"}, d.o.map((o,j)=>el("button",{class:"opt",type:"button",
          "data-pick": picked===j?"1":null,
          "data-res": answered? (j===d.a?"ok":(picked===j?"bad":null)):null,
          disabled: answered? "":null,
          onclick:()=>{ rec[pickKey]=j; rec[i]= j===d.a; save(); bump("gram", j===d.a); renderGram(); }
        }, el("span",{class:"k"},"ABCD"[j]), el("span",{},o)))),
        answered? el("div",{class:"explain"}, el("span",{class:"tag"},"Por qué"), el("span",{html:d.e})):null)));
  });
  out.append(el("div",{class:"row",style:"margin-top:14px"},
    el("button",{class:"btn ghost small",type:"button",onclick:()=>{ P().gram[u.id]={}; save(); renderGram(); }},"Repetir esta unidad"),
    el("button",{class:"btn ghost small",type:"button",onclick:()=>{
      const i=T().grammar.findIndex(x=>x.id===gramSel); gramSel=T().grammar[(i+1)%T().grammar.length].id; renderGram(); window.scrollTo({top:0,behavior:"smooth"});
    }},"Siguiente unidad →")));
}
