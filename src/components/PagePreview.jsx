import { useState } from "react";
import { T } from "../lib/theme";
import { useHtmlText } from "../lib/useHtmlText";

export function PagePreview({ page }) {
  const screenshotUrl = page?.screenshotUrl ?? null;
  const { html, failed: htmlFailed } = useHtmlText(page?.htmlUrl ?? null);
  const [imgState, setImgState] = useState({ url: screenshotUrl, failed: false });

  if (imgState.url !== screenshotUrl) {
    setImgState({ url: screenshotUrl, failed: false });
  }
  const imgFailed = imgState.failed;

  if (!page) {
    return (
      <div style={{height:200,display:"flex",alignItems:"center",justifyContent:"center",background:T.bg1,borderRadius:12,border:`1px dashed ${T.border}`}}>
        <span style={{fontSize:13,color:T.text2,fontFamily:T.body}}>No preview available</span>
      </div>
    );
  }

  return (
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      <div style={{border:"1px solid rgba(255,255,255,0.1)",borderRadius:12,overflow:"hidden"}}>
        <div style={{background:"#1A1B2C",padding:"8px 14px",display:"flex",alignItems:"center",gap:8,borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
          <div style={{display:"flex",gap:6}}>{["#FF5F57","#FEBC2E","#28C840"].map(c=><div key={c} style={{width:11,height:11,borderRadius:"50%",background:c}}/>)}</div>
          <div style={{flex:1,background:"rgba(255,255,255,0.05)",borderRadius:6,padding:"4px 12px",fontSize:11,color:T.text2,fontFamily:T.mono,marginLeft:6}}>{page.path}</div>
        </div>
        {screenshotUrl && !imgFailed ? (
          <img src={screenshotUrl} alt={`Screenshot of ${page.path}`} onError={()=>setImgState((s)=>({...s,failed:true}))} style={{width:"100%",display:"block"}}/>
        ) : (
          <div style={{height:200,display:"flex",alignItems:"center",justifyContent:"center",background:T.bg1}}>
            <span style={{fontSize:13,color:T.text2,fontFamily:T.body}}>{screenshotUrl ? "Screenshot unavailable" : "No screenshot available"}</span>
          </div>
        )}
      </div>
      <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:12,padding:"12px 16px"}}>
        <div style={{fontSize:11,color:T.text2,fontFamily:T.sans,letterSpacing:".5px",fontWeight:600,marginBottom:8}}>HTML</div>
        {!page.htmlUrl && (
          <div style={{fontSize:12,color:T.text2,fontFamily:T.body}}>No HTML captured for this page.</div>
        )}
        {page.htmlUrl && html != null && (
          <pre style={{fontFamily:T.mono,fontSize:11,lineHeight:1.5,color:T.text1,whiteSpace:"pre-wrap",wordBreak:"break-all",maxHeight:240,overflowY:"auto",margin:0}}>{html}</pre>
        )}
        {page.htmlUrl && html == null && htmlFailed && (
          <a href={page.htmlUrl} target="_blank" rel="noreferrer" style={{fontSize:12,color:T.accent,fontFamily:T.body}}>View raw HTML ↗</a>
        )}
        {page.htmlUrl && html == null && !htmlFailed && (
          <div style={{fontSize:12,color:T.text2,fontFamily:T.body}}>Loading…</div>
        )}
      </div>
    </div>
  );
}
