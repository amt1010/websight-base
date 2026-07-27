import { useState } from "react";
import { T, hex2rgb, pct } from "../../lib/theme";
import { StackedPreview } from "./StackedPreview";

export function TemplatesTab({data}){
  const [sel, setSel] = useState(data.templates[0]);
  return(
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      <div style={{background:`rgba(${hex2rgb(T.accent)},0.06)`,border:`1px solid rgba(${hex2rgb(T.accent)},0.2)`,borderRadius:10,padding:"10px 14px",fontSize:13,color:T.text1,fontFamily:T.body,lineHeight:1.6}}>
        Found <strong style={{color:T.text0}}>{data.templates.length} page templates</strong>. Click a template to see its stacked page anatomy with API attribution. Switch to the <strong style={{color:T.accent}}>X-Ray tab</strong> for the full 6-layer deep view.
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:8}}>
        {data.templates.map(t=>{const p=pct(t.count,t.total);const active=sel?.id===t.id;return(
          <div key={t.id} onClick={()=>setSel(active?null:t)}
            style={{background:active?`rgba(${hex2rgb(t.color)},0.1)`:T.card,border:active?`1.5px solid rgba(${hex2rgb(t.color)},0.5)`:`1px solid ${T.border}`,borderRadius:10,padding:"12px 14px",cursor:"pointer",transition:"all .15s"}}>
            <div style={{width:8,height:8,borderRadius:2,background:t.color,marginBottom:8}}/>
            <div style={{fontSize:12,fontWeight:600,color:active?T.text0:T.text1,fontFamily:T.sans,marginBottom:3,lineHeight:1.3}}>{t.name}</div>
            <div style={{fontSize:11,color:T.text2,fontFamily:T.body,marginBottom:6}}>{t.count.toLocaleString()} pages · {p}%</div>
            <div style={{height:2,background:"rgba(255,255,255,0.06)",borderRadius:1}}><div style={{height:"100%",width:`${Math.min(100,p)}%`,background:t.color,borderRadius:1}}/></div>
            <div style={{display:"flex",flexWrap:"wrap",gap:4,marginTop:8}}>{t.features.slice(0,3).map(f=><span key={f} style={{fontSize:10,padding:"2px 6px",borderRadius:4,background:"rgba(255,255,255,0.04)",border:`1px solid ${T.border}`,color:T.text2,fontFamily:T.body}}>{f}</span>)}</div>
          </div>);
        })}
      </div>
      <StackedPreview template={sel}/>
    </div>
  );
}
