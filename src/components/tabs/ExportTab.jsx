import { T, hex2rgb } from "../../lib/theme";
import { Badge } from "../ui/Badge";

export function ExportTab(){
  const exports=[{icon:"⬇",label:"PDF Discovery Report",desc:"Full analysis + X-ray views for client delivery",badge:"PDF",color:T.accent},{icon:"⬇",label:"CSV — URL inventory",desc:"All pages, templates, and sitemap sections",badge:"CSV",color:T.cyan},{icon:"⬇",label:"JSON — raw analysis",desc:"Machine-readable output for downstream tools",badge:"JSON",color:T.violet},{icon:"⬇",label:"Figma sitemap kit",desc:"Mind map as Figma-compatible JSON",badge:"Figma",color:T.green}];
  return(
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      {exports.map(e=>(
        <div key={e.label} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:12,padding:"14px 18px",display:"flex",alignItems:"center",gap:14,cursor:"pointer"}} onMouseEnter={ev=>ev.currentTarget.style.borderColor=`rgba(${hex2rgb(e.color)},0.4)`} onMouseLeave={ev=>ev.currentTarget.style.borderColor=T.border}>
          <div style={{width:36,height:36,borderRadius:9,background:`rgba(${hex2rgb(e.color)},0.12)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{e.icon}</div>
          <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:T.text0,fontFamily:T.sans,marginBottom:2}}>{e.label}</div><div style={{fontSize:12,color:T.text2,fontFamily:T.body}}>{e.desc}</div></div>
          <Badge label={e.badge} color={e.color}/>
        </div>
      ))}
      <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:12,padding:"14px 18px",marginTop:4}}>
        <div style={{fontSize:12,fontWeight:600,color:T.text2,fontFamily:T.sans,letterSpacing:".6px",marginBottom:10}}>SHARE & COLLABORATE</div>
        <div style={{display:"flex",gap:8}}>
          <input readOnly value="https://websight.app/share/bswhealth-2026-06-15" style={{flex:1,background:T.bg2,border:`1px solid ${T.border}`,borderRadius:7,padding:"8px 12px",fontSize:12,color:T.text1,fontFamily:T.mono,outline:"none"}}/>
          <button style={{padding:"8px 16px",background:T.accentDim,border:`1px solid rgba(${hex2rgb(T.accent)},0.3)`,borderRadius:7,color:T.accent,fontSize:12,fontFamily:T.sans,fontWeight:500,cursor:"pointer"}}>Copy link</button>
        </div>
      </div>
    </div>
  );
}
