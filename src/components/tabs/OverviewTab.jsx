import { T, hex2rgb } from "../../lib/theme";

export function OverviewTab({data}){
  const metrics=[{l:"Total pages",v:data.metrics.pages.toLocaleString(),c:T.accent},{l:"Sitemap sections",v:data.metrics.sections,c:T.violet},{l:"Page templates",v:data.metrics.templates,c:T.cyan},{l:"APIs detected",v:data.metrics.apis,c:T.green},{l:"Crawl time",v:data.metrics.crawlTime,c:T.amber}];
  return(
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:12,padding:"16px 20px",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:-20,right:-20,width:120,height:120,borderRadius:"50%",background:`radial-gradient(circle,rgba(${hex2rgb(T.accent)},0.15),transparent 70%)`,pointerEvents:"none"}}/>
        <div style={{fontSize:18,fontWeight:700,color:T.text0,fontFamily:T.sans,letterSpacing:"-.4px"}}>{data.domain}</div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8}}>{metrics.map(m=>(
        <div key={m.l} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:10,padding:"12px 14px",position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",bottom:-8,right:-8,width:40,height:40,borderRadius:"50%",background:`rgba(${hex2rgb(m.c)},0.1)`}}/>
          <div style={{fontSize:11,color:T.text2,fontFamily:T.body,marginBottom:6}}>{m.l}</div>
          <div style={{fontSize:22,fontWeight:700,color:m.c,fontFamily:T.sans,letterSpacing:"-.5px"}}>{m.v}</div>
        </div>
      ))}</div>
    </div>
  );
}
