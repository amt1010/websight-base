import { useState } from "react";
import { T } from "../lib/theme";
import { PagePreview } from "./PagePreview";

export function XRayTab({ pages }) {
  const okPages = (pages ?? []).filter((p) => p.status === "ok");
  const [selectedUrl, setSelectedUrl] = useState(okPages[0]?.url ?? null);
  const selected = okPages.find((p) => p.url === selectedUrl) ?? null;

  if (okPages.length === 0) {
    return (
      <div style={{height:200,display:"flex",alignItems:"center",justifyContent:"center",background:T.bg1,borderRadius:12,border:`1px dashed ${T.border}`}}>
        <span style={{fontSize:13,color:T.text2,fontFamily:T.body}}>No pages available to preview</span>
      </div>
    );
  }

  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <span style={{fontSize:12,color:T.text2,fontFamily:T.body}}>Page</span>
        <select value={selectedUrl} onChange={(e)=>setSelectedUrl(e.target.value)} style={{flex:1,background:T.bg2,border:`1px solid ${T.border}`,borderRadius:8,padding:"8px 12px",fontSize:13,color:T.text0,fontFamily:T.mono,outline:"none"}}>
          {okPages.map((p)=>(<option key={p.url} value={p.url}>{p.path}</option>))}
        </select>
      </div>
      <PagePreview page={selected}/>
    </div>
  );
}
