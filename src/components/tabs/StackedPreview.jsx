import { useState } from "react";
import { T, hex2rgb } from "../../lib/theme";
import { Badge } from "../ui/Badge";

export function StackedPreview({template}) {
  const [hovLayer, setHovLayer] = useState(null);
  if (!template) return (
    <div style={{height:200,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:10,background:T.bg1,borderRadius:12,border:`1px dashed ${T.border}`}}>
      <span style={{fontSize:28,opacity:0.3}}>◈</span>
      <span style={{fontSize:13,color:T.text2,fontFamily:T.body}}>Select a template to see its page anatomy</span>
    </div>
  );
  const apiColors = {"Phynd Provider API":"#6366F1","Epic Open Scheduling":"#10B981","Location Geo API":"#22D3EE","Google Maps Places":"#22D3EE"};
  return (
    <div>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
        <Badge label="Stacked View" color={template.color}/>
        <span style={{fontSize:13,color:T.text1,fontFamily:T.body}}>Page anatomy · <strong style={{color:T.text0}}>{template.name}</strong></span>
      </div>
      <div style={{border:`1px solid rgba(255,255,255,0.1)`,borderRadius:12,overflow:"hidden",boxShadow:`0 0 40px rgba(${hex2rgb(template.color)},0.1)`}}>
        {/* browser title bar */}
        <div style={{background:"#1A1B2C",padding:"8px 14px",display:"flex",alignItems:"center",gap:8,borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
          <div style={{display:"flex",gap:6}}>{["#FF5F57","#FEBC2E","#28C840"].map(c=><div key={c} style={{width:11,height:11,borderRadius:"50%",background:c}}/>)}</div>
          <div style={{flex:1,background:"rgba(255,255,255,0.05)",borderRadius:6,padding:"4px 12px",fontSize:11,color:T.text2,fontFamily:T.mono,marginLeft:6}}>
            bswhealth.com{template.pattern.split("·")[0].trim().replace("/*","/{slug}")}
          </div>
          <div style={{display:"flex",gap:4,opacity:0.5}}>
            {["↺","⊞","↗"].map(s=><span key={s} style={{fontSize:12,color:T.text2,padding:"0 4px"}}>{s}</span>)}
          </div>
        </div>
        {/* page layers */}
        <div style={{position:"relative",background:T.bg0}}>
          {/* scan-line overlay */}
          <div style={{position:"absolute",inset:0,backgroundImage:"repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(255,255,255,0.015) 3px,rgba(255,255,255,0.015) 4px)",pointerEvents:"none",zIndex:3}}/>
          {template.layers.map((layer,i) => {
            const apiCol = layer.api ? (apiColors[layer.api] || layer.color) : layer.color;
            const isHov = hovLayer === i;
            return (
              <div key={i} onMouseEnter={()=>setHovLayer(i)} onMouseLeave={()=>setHovLayer(null)}
                style={{position:"relative",height:layer.h,background:isHov?`rgba(${hex2rgb(apiCol)},0.22)`:`rgba(${hex2rgb(apiCol)},${layer.api?0.12:0.06})`,borderBottom:"1px solid rgba(255,255,255,0.04)",display:"flex",alignItems:"center",padding:"0 14px",transition:"background .15s",cursor:"default",zIndex:2}}>
                {/* left accent bar */}
                <div style={{position:"absolute",left:0,top:4,bottom:4,width:3,background:apiCol,borderRadius:"0 2px 2px 0",opacity:isHov?1:0.5}}/>
                <div style={{display:"flex",alignItems:"center",gap:10,flex:1}}>
                  <span style={{fontSize:12,color:isHov?T.text0:apiCol,fontFamily:T.sans,fontWeight:500,opacity:isHov?1:0.8}}>{layer.label}</span>
                  {layer.api && <Badge label={layer.api} color={apiCol} dim={!isHov}/>}
                </div>
                {/* shimmer content lines */}
                <div style={{display:"flex",flexDirection:"column",gap:5,opacity:isHov?0.5:0.2}}>
                  {Array.from({length:Math.max(1,Math.floor(layer.h/26))}).map((_,j)=>(
                    <div key={j} style={{height:6,width:40+j*18,background:apiCol,borderRadius:3}}/>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {/* legend */}
      <div style={{display:"flex",flexWrap:"wrap",gap:10,marginTop:12}}>
        {[...new Set(template.layers.map(l=>l.api).filter(Boolean))].map(api => {
          const col = apiColors[api] || "#6366F1";
          return (
            <div key={api} style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:T.text1,fontFamily:T.body}}>
              <div style={{width:8,height:8,borderRadius:2,background:col}}/>{api}
            </div>
          );
        })}
        <div style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:T.text2,fontFamily:T.body}}>
          <div style={{width:8,height:8,borderRadius:2,background:"#334155"}}/> Static / CMS
        </div>
      </div>
    </div>
  );
}
