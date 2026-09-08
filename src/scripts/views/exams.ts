import { S, save } from "../state";
import { $, el } from "../dom";

$("#examDateBtn").onclick=()=>{
  const v=$<HTMLInputElement>("#examDate").value.trim();
  const d=new Date(v+"T12:00:00");
  const out=$("#examPlanOut"); out.innerHTML="";
  if(isNaN(d.getTime())){ out.append(el("div",{class:"fb err"},"No pude leer esa fecha. Usa el formato AAAA-MM-DD, por ejemplo 2027-03-14.")); return; }
  S.examDate=v; save();
  const days=Math.round((d.getTime()-Date.now())/86400000);
  const weeks=Math.floor(days/7);
  let msg;
  if(days<0) msg="Esa fecha ya pasó. Si ya presentaste el examen, fija la del siguiente objetivo.";
  else if(weeks<4) msg="Quedan "+days+" días ("+weeks+" semanas). No hay tiempo para el plan completo: ve directo al Bloque D (semanas 19–24) y prioriza formato, simulacros y Writing. Nada de vocabulario nuevo.";
  else if(weeks<12) msg="Quedan "+days+" días ("+weeks+" semanas). Plan comprimido: haz los bloques C y D en "+weeks+" semanas, a razón de "+(12/weeks>1?"más de una":"una")+" semana del plan por semana real, y un simulacro cada quince días.";
  else if(weeks<=26) msg="Quedan "+days+" días ("+weeks+" semanas). Encaja con el plan completo de 24 semanas. Empieza hoy por la semana "+Math.max(1,25-weeks)+".";
  else msg="Quedan "+days+" días ("+weeks+" semanas). Tienes margen: dedica las primeras "+(weeks-24)+" semanas a consolidar B1 con los módulos 04 y 05 antes de entrar en el plan de 24 semanas.";
  const hitos: Array<[string, number]> = [
    ["Inscripción y pago", -Math.max(45,Math.floor(days*0.5))],
    ["Primer simulacro completo", -Math.floor(days*0.55)],
    ["Segundo simulacro y ajuste", -Math.floor(days*0.25)],
    ["Simulacro final en condiciones reales", -10],
    ["Bajar carga a 30 min/día", -7]
  ];
  out.append(el("div",{class:"fb"},msg));
  const rows=hitos.map(([n,off])=>{
    const dd=new Date(d.getTime()+off*86400000);
    return el("tr",{},el("td",{},n),el("td",{class:"num"},dd.toISOString().slice(0,10)),el("td",{class:"num"},(off*-1)+" días antes"));
  });
  out.append(el("div",{class:"tblwrap"},el("table",{},
    el("thead",{},el("tr",{},el("th",{},"Hito"),el("th",{},"Fecha"),el("th",{},"Antelación"))),
    el("tbody",{},rows))));
};
