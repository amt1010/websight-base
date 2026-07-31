import { T, hex2rgb } from "../lib/theme";
import { RESTRICTED_TABS } from "../lib/access";

const NAV=[
  {id:"overview",icon:"⊞",label:"Overview"},{id:"sitemap",icon:"⊛",label:"Sitemap"},
  {id:"templates",icon:"⊟",label:"Templates"},{id:"xray",icon:"◈",label:"X-Ray"},
  {id:"apis",icon:"⊕",label:"APIs"},{id:"export",icon:"↓",label:"Export"},
];

export function Sidebar({tab,setTab,projects,access,currentCrawlId,onLogout}){
  return(
    <div style={{width:200,background:T.bg1,borderRight:`1px solid ${T.border}`,display:"flex",flexDirection:"column",flexShrink:0,minHeight:620}}>
      <div style={{padding:"18px 16px 14px",borderBottom:`1px solid ${T.border}`}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{width:28,height:28,background:"linear-gradient(135deg,#6366F1,#8B5CF6)",borderRadius:7,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><span style={{fontSize:14,color:"#fff",fontWeight:700,fontFamily:T.sans}}>W</span></div>
          <div><div style={{fontSize:13,fontWeight:700,color:T.text0,fontFamily:T.sans,letterSpacing:"-.3px"}}>WebSight</div><div style={{fontSize:10,color:T.accent,fontFamily:T.mono,letterSpacing:".5px"}}>DISCOVERY</div></div>
        </div>
      </div>
      <div style={{padding:"10px 8px",flex:1}}>
        <div style={{fontSize:10,color:T.text2,fontFamily:T.sans,letterSpacing:".8px",padding:"6px 8px 4px",fontWeight:600}}>ANALYSIS</div>
        {NAV.map(n=>{
          const active=tab===n.id;
          const restricted=RESTRICTED_TABS.includes(n.id)&&access?.tier!=="paid";
          return(
          <button key={n.id} onClick={()=>setTab(n.id)} style={{width:"100%",display:"flex",alignItems:"center",gap:8,padding:"8px 10px",marginBottom:2,background:active?T.accentDim:"transparent",border:active?`1px solid ${T.border}`:"1px solid transparent",borderRadius:8,color:active?T.text0:T.text1,cursor:"pointer",fontSize:13,fontFamily:T.sans,fontWeight:active?500:400,textAlign:"left",transition:"all .12s"}}>
            <span style={{fontSize:14,width:18,textAlign:"center",color:active?T.accent:T.text2}}>{n.icon}</span>{n.label}
            {restricted&&<span style={{marginLeft:"auto",fontSize:11}}>🔒</span>}
          </button>);
        })}
        <div style={{height:1,background:T.border,margin:"6px 0"}}/>
        <div style={{fontSize:10,color:T.text2,fontFamily:T.sans,letterSpacing:".8px",padding:"8px 8px 4px",fontWeight:600}}>PROJECTS</div>
        {projects.map(p=>{
          const isCurrent=p.id===currentCrawlId;
          const statusLabel=p.status==="done"?"✓ Done":p.status==="failed"?"✕ Failed":p.status==="running"?"… Running":"… Queued";
          return(
          <div key={p.id} style={{padding:"7px 10px",borderRadius:8,marginBottom:2,background:isCurrent?T.accentDim:"transparent",border:isCurrent?`1px solid ${T.border}`:"1px solid transparent",cursor:"pointer"}}>
            <div style={{fontSize:12,color:isCurrent?T.text0:T.text1,fontFamily:T.mono,fontWeight:500,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{p.name}</div>
            <div style={{fontSize:10,color:T.text2,fontFamily:T.body,marginTop:2,display:"flex",justifyContent:"space-between"}}><span>{statusLabel}</span></div>
          </div>);
        })}
      </div>
      <div style={{padding:"12px 16px",borderTop:`1px solid ${T.border}`}}>
        <div style={{fontSize:11,color:T.text2,fontFamily:T.body,lineHeight:1.5}}>
          <div style={{color:T.text1,fontWeight:500,marginBottom:2}}>Starter plan</div><div>3 / 10 analyses used</div>
          <div style={{height:3,background:"rgba(255,255,255,0.06)",borderRadius:2,marginTop:6}}><div style={{height:"100%",width:"30%",background:T.accent,borderRadius:2}}/></div>
        </div>
        <button style={{marginTop:10,width:"100%",padding:"7px",background:`rgba(${hex2rgb(T.accent)},0.15)`,border:`1px solid rgba(${hex2rgb(T.accent)},0.3)`,borderRadius:7,color:T.accent,fontSize:12,fontFamily:T.sans,fontWeight:500,cursor:"pointer"}}>Upgrade ↗</button>
        <button onClick={()=>onLogout?.()} style={{marginTop:8,width:"100%",padding:"7px",background:"transparent",border:`1px solid ${T.border}`,borderRadius:7,color:T.text1,fontSize:12,fontFamily:T.sans,fontWeight:500,cursor:"pointer"}}>Log out</button>
      </div>
    </div>
  );
}
