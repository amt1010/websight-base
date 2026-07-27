import { useState } from "react";
import { T, hex2rgb } from "../../lib/theme";
import { Badge } from "../ui/Badge";

export function APIsTab({data}){
  const[sel,setSel]=useState(null);
  const cc={High:T.green,Medium:T.amber,Low:T.red};
  return(
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      {data.apis.map((a,i)=>{const open=sel===i;return(
        <div key={a.name} onClick={()=>setSel(open?null:i)} style={{background:open?`rgba(${hex2rgb(a.color)},0.08)`:T.card,border:open?`1px solid rgba(${hex2rgb(a.color)},0.4)`:`1px solid ${T.border}`,borderRadius:12,overflow:"hidden",cursor:"pointer",transition:"all .15s"}}>
          <div style={{padding:"14px 16px",display:"flex",gap:14,alignItems:"flex-start"}}>
            <div style={{width:4,borderRadius:2,background:a.color,alignSelf:"stretch",flexShrink:0,minHeight:40}}/>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:6}}>
                <span style={{fontSize:14,fontWeight:600,color:T.text0,fontFamily:T.sans}}>{a.name}</span>
                <Badge label={a.confidence} color={cc[a.confidence]||T.green}/><Badge label={a.type} color={a.color} dim/>
              </div>
              <div style={{fontSize:13,color:T.text1,fontFamily:T.body,lineHeight:1.6}}>{a.purpose}</div>
            </div>
            <span style={{color:T.text2,fontSize:14,flexShrink:0,marginTop:2,transform:open?"rotate(180deg)":"none",transition:"transform .2s"}}>⌄</span>
          </div>
          {open&&<div style={{borderTop:"1px solid rgba(255,255,255,0.05)",padding:"12px 16px 14px",paddingLeft:34}}>
            <div style={{fontSize:11,color:T.text2,fontFamily:T.sans,letterSpacing:".5px",fontWeight:600,marginBottom:6}}>ENDPOINTS</div>
            {a.endpoints.map(e=><div key={e} style={{fontSize:12,color:T.cyan,fontFamily:T.mono,padding:"4px 10px",background:"rgba(34,211,238,0.05)",borderRadius:5,marginBottom:4,border:"1px solid rgba(34,211,238,0.1)"}}>{e}</div>)}
            <div style={{display:"flex",gap:16,flexWrap:"wrap",marginTop:8}}>
              <div><div style={{fontSize:11,color:T.text2,fontFamily:T.sans,letterSpacing:".5px",fontWeight:600,marginBottom:3}}>METHOD</div><span style={{fontSize:12,color:T.text1,fontFamily:T.mono}}>{a.method}</span></div>
              <div><div style={{fontSize:11,color:T.text2,fontFamily:T.sans,letterSpacing:".5px",fontWeight:600,marginBottom:3}}>TRIGGER</div><span style={{fontSize:12,color:T.text1,fontFamily:T.body}}>{a.trigger}</span></div>
            </div>
          </div>}
        </div>);
      })}
    </div>
  );
}
