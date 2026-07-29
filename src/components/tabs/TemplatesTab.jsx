import { useState } from "react";
import { T, hex2rgb, pct } from "../../lib/theme";

export function TemplatesTab({data}){
  const [sel, setSel] = useState(data.templates[0] ?? null);
  return(
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      <div style={{background:`rgba(${hex2rgb(T.accent)},0.06)`,border:`1px solid rgba(${hex2rgb(T.accent)},0.2)`,borderRadius:10,padding:"10px 14px",fontSize:13,color:T.text1,fontFamily:T.body,lineHeight:1.6}}>
        Found <strong style={{color:T.text0}}>{data.templates.length} page templates</strong>. Click a template to see its URL pattern and page count.
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:8}}>
        {data.templates.map(t=>{const p=pct(t.count,t.total);const active=sel?.id===t.id;return(
          <div key={t.id} onClick={()=>setSel(active?null:t)}
            style={{background:active?`rgba(${hex2rgb(t.color)},0.1)`:T.card,border:active?`1.5px solid rgba(${hex2rgb(t.color)},0.5)`:`1px solid ${T.border}`,borderRadius:10,padding:"12px 14px",cursor:"pointer",transition:"all .15s"}}>
            <div style={{width:8,height:8,borderRadius:2,background:t.color,marginBottom:8}}/>
            <div style={{fontSize:12,fontWeight:600,color:active?T.text0:T.text1,fontFamily:T.sans,marginBottom:3,lineHeight:1.3}}>{t.name}</div>
            <div style={{fontSize:11,color:T.text2,fontFamily:T.body,marginBottom:6}}>{t.count.toLocaleString()} pages · {p}%</div>
            <div style={{height:2,background:"rgba(255,255,255,0.06)",borderRadius:1}}><div style={{height:"100%",width:`${Math.min(100,p)}%`,background:t.color,borderRadius:1}}/></div>
          </div>);
        })}
      </div>
      {sel ? (
        <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:12,padding:"14px 18px"}}>
          <div style={{fontSize:12,fontWeight:600,color:T.text2,fontFamily:T.sans,letterSpacing:".6px",marginBottom:8}}>SELECTED TEMPLATE</div>
          <div style={{fontSize:13,color:T.text1,fontFamily:T.mono,marginBottom:4}}>{sel.pattern}</div>
          <div style={{fontSize:12,color:T.text2,fontFamily:T.body}}>{sel.count.toLocaleString()} of {sel.total.toLocaleString()} pages</div>
        </div>
      ) : (
        <div style={{height:120,display:"flex",alignItems:"center",justifyContent:"center",background:T.bg1,borderRadius:12,border:`1px dashed ${T.border}`}}>
          <span style={{fontSize:13,color:T.text2,fontFamily:T.body}}>Select a template to see details</span>
        </div>
      )}
    </div>
  );
}
