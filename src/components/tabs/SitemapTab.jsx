import { T } from "../../lib/theme";
import { Badge } from "../ui/Badge";
import { MindMap } from "../MindMap";

export function SitemapTab({data}){
  return(
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <MindMap nodes={data.nodes}/>
      <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:12,padding:"14px 18px"}}>
        <div style={{fontSize:12,fontWeight:600,color:T.text2,fontFamily:T.sans,letterSpacing:".6px",marginBottom:10}}>SITEMAP FILES</div>
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {[["/physician-sitemap.xml","4,200","Phynd"],["/allied-health-professional-sitemap.xml","1,800","Phynd"],["/nurse-practitioner-sitemap.xml","900","Phynd"],["/physician-assistant-sitemap.xml","600","Phynd"],["/location-sitemap.xml","744","Geo API"],["/blog-sitemap.xml","2,200","CMS"],["/specialty-sitemap.xml","180","CMS"]].map(([p,c,a])=>(
            <div key={p} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"6px 10px",background:T.bg2,borderRadius:7}}>
              <span style={{fontSize:12,color:T.text1,fontFamily:T.mono}}>{p}</span>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <span style={{fontSize:11,color:T.text2}}>{c} URLs</span>
                <Badge label={a} color={a==="Phynd"?T.accent:a==="Geo API"?T.cyan:T.text2} dim/>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
