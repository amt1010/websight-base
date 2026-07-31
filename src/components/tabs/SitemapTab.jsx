import { T } from "../../lib/theme";
import { MindMap } from "../MindMap";

export function SitemapTab({data}){
  const sections=(data.nodes??[]).filter(n=>n.parent==="root").sort((a,b)=>b.count-a.count);
  return(
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <MindMap nodes={data.nodes}/>
      <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:12,padding:"14px 18px"}}>
        <div style={{fontSize:12,fontWeight:600,color:T.text2,fontFamily:T.sans,letterSpacing:".6px",marginBottom:10}}>SECTIONS</div>
        {sections.length===0?(
          <div style={{fontSize:12,color:T.text2,fontFamily:T.body}}>No sections found.</div>
        ):(
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {sections.map(n=>(
              <div key={n.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"6px 10px",background:T.bg2,borderRadius:7}}>
                <span style={{fontSize:12,color:T.text1,fontFamily:T.mono}}>/{n.label}</span>
                <span style={{fontSize:11,color:T.text2}}>{n.count.toLocaleString()} pages</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
