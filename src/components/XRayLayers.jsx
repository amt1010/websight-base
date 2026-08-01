import { useState, useMemo } from "react";
import { T } from "../lib/theme";
import { useHtmlText } from "../lib/useHtmlText";
import { deriveLayers, LAYER_DEFS } from "../lib/xrayLayers";

function ScreenshotPanel({ page }) {
  const screenshotUrl = page?.screenshotUrl ?? null;
  const [imgState, setImgState] = useState({ url: screenshotUrl, failed: false });
  if (imgState.url !== screenshotUrl) {
    setImgState({ url: screenshotUrl, failed: false });
  }
  return (
    <div style={{border:"1px solid rgba(255,255,255,0.1)",borderRadius:12,overflow:"hidden"}}>
      <div style={{background:"#1A1B2C",padding:"8px 14px",display:"flex",alignItems:"center",gap:8,borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
        <div style={{display:"flex",gap:6}}>{["#FF5F57","#FEBC2E","#28C840"].map(c=><div key={c} style={{width:11,height:11,borderRadius:"50%",background:c}}/>)}</div>
        <div style={{flex:1,background:"rgba(255,255,255,0.05)",borderRadius:6,padding:"4px 12px",fontSize:11,color:T.text2,fontFamily:T.mono,marginLeft:6}}>{page.path}</div>
      </div>
      {screenshotUrl && !imgState.failed ? (
        <img src={screenshotUrl} alt={`Screenshot of ${page.path}`} onError={()=>setImgState((s)=>({...s,failed:true}))} style={{width:"100%",display:"block"}}/>
      ) : (
        <div style={{height:200,display:"flex",alignItems:"center",justifyContent:"center",background:T.bg1}}>
          <span style={{fontSize:13,color:T.text2,fontFamily:T.body}}>{screenshotUrl ? "Screenshot unavailable" : "No screenshot available"}</span>
        </div>
      )}
    </div>
  );
}

function HtmlPanel({ page, html, htmlFailed }) {
  return (
    <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:12,padding:"12px 16px"}}>
      <div style={{fontSize:11,color:T.text2,fontFamily:T.sans,letterSpacing:".5px",fontWeight:600,marginBottom:8}}>HTML / DOM</div>
      {!page.htmlUrl && (
        <div style={{fontSize:12,color:T.text2,fontFamily:T.body}}>No HTML captured for this page.</div>
      )}
      {page.htmlUrl && html != null && (
        <pre style={{fontFamily:T.mono,fontSize:11,lineHeight:1.5,color:T.text1,whiteSpace:"pre-wrap",wordBreak:"break-all",maxHeight:300,overflowY:"auto",margin:0}}>{html}</pre>
      )}
      {page.htmlUrl && html == null && htmlFailed && (
        <a href={page.htmlUrl} target="_blank" rel="noreferrer" style={{fontSize:12,color:T.accent,fontFamily:T.body}}>View raw HTML ↗</a>
      )}
      {page.htmlUrl && html == null && !htmlFailed && (
        <div style={{fontSize:12,color:T.text2,fontFamily:T.body}}>Loading…</div>
      )}
    </div>
  );
}

function TextPanel({ derived }) {
  return (
    <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:12,padding:"12px 16px"}}>
      <div style={{fontSize:11,color:T.text2,fontFamily:T.sans,letterSpacing:".5px",fontWeight:600,marginBottom:8}}>CONTENT / TEXT</div>
      <div style={{fontFamily:T.body,fontSize:12,lineHeight:1.6,color:T.text1,whiteSpace:"pre-wrap",maxHeight:300,overflowY:"auto"}}>{derived.text}</div>
    </div>
  );
}

function CssPanel({ derived }) {
  return (
    <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:12,padding:"12px 16px",display:"flex",flexDirection:"column",gap:12}}>
      <div style={{fontSize:11,color:T.text2,fontFamily:T.sans,letterSpacing:".5px",fontWeight:600}}>CSS / STYLES</div>
      {derived.css.inline && (
        <pre style={{fontFamily:T.mono,fontSize:11,lineHeight:1.5,color:T.text1,whiteSpace:"pre-wrap",wordBreak:"break-all",maxHeight:220,overflowY:"auto",margin:0}}>{derived.css.inline}</pre>
      )}
      {derived.css.linked.length > 0 && (
        <div style={{display:"flex",flexDirection:"column",gap:4}}>
          {derived.css.linked.map((href) => (
            <a key={href} href={href} target="_blank" rel="noreferrer" style={{fontSize:12,color:T.accent,fontFamily:T.mono,wordBreak:"break-all"}}>{href}</a>
          ))}
        </div>
      )}
    </div>
  );
}

function ResourcesPanel({ derived }) {
  const groups = ["script", "stylesheet", "image", "iframe"]
    .map((type) => ({ type, items: derived.resources.filter((r) => r.type === type) }))
    .filter((g) => g.items.length > 0);
  return (
    <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:12,padding:"12px 16px",display:"flex",flexDirection:"column",gap:12}}>
      <div style={{fontSize:11,color:T.text2,fontFamily:T.sans,letterSpacing:".5px",fontWeight:600}}>NETWORK / APIS</div>
      <div style={{fontSize:11,color:T.text2,fontFamily:T.body,fontStyle:"italic"}}>Resources referenced in this page&apos;s HTML — not a live network capture.</div>
      {groups.map((g) => (
        <div key={g.type} style={{display:"flex",flexDirection:"column",gap:4}}>
          <div style={{fontSize:11,color:T.text1,fontFamily:T.sans,fontWeight:600,textTransform:"capitalize"}}>{g.type}</div>
          {g.items.map((r) => (
            <a key={r.url} href={r.url} target="_blank" rel="noreferrer" style={{fontSize:12,color:T.accent,fontFamily:T.mono,wordBreak:"break-all"}}>{r.url}</a>
          ))}
        </div>
      ))}
    </div>
  );
}

function SchemaPanel({ derived }) {
  return (
    <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:12,padding:"12px 16px",display:"flex",flexDirection:"column",gap:12}}>
      <div style={{fontSize:11,color:T.text2,fontFamily:T.sans,letterSpacing:".5px",fontWeight:600}}>DATA / SCHEMA</div>
      {derived.schema.jsonLd.map((obj, i) => (
        <pre key={i} style={{fontFamily:T.mono,fontSize:11,lineHeight:1.5,color:T.text1,whiteSpace:"pre-wrap",wordBreak:"break-all",maxHeight:220,overflowY:"auto",margin:0}}>{JSON.stringify(obj, null, 2)}</pre>
      ))}
      {derived.schema.meta.length > 0 && (
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {derived.schema.meta.map((m) => (
            <div key={m.name} style={{display:"flex",gap:8,fontSize:12,fontFamily:T.body}}>
              <span style={{color:T.text2,minWidth:110}}>{m.name}</span>
              <span style={{color:T.text1}}>{m.content}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const PANEL_COMPONENTS = {
  visual: ScreenshotPanel,
  text: TextPanel,
  html: HtmlPanel,
  css: CssPanel,
  network: ResourcesPanel,
  schema: SchemaPanel,
};

export function XRayLayers({ page }) {
  const { html, failed: htmlFailed } = useHtmlText(page?.htmlUrl ?? null);
  const derived = useMemo(() => deriveLayers(html), [html]);
  const availableLayers = useMemo(() => LAYER_DEFS.filter((l) => l.hasContent(derived, page)), [derived, page]);
  const [activeLayerId, setActiveLayerId] = useState("visual");
  const [exploded, setExploded] = useState(false);

  const hasAnyPreview = Boolean(page?.screenshotUrl) || Boolean(page?.htmlUrl);
  if (!page || !hasAnyPreview) {
    return (
      <div style={{height:200,display:"flex",alignItems:"center",justifyContent:"center",background:T.bg1,borderRadius:12,border:`1px dashed ${T.border}`}}>
        <span style={{fontSize:13,color:T.text2,fontFamily:T.body}}>No preview available</span>
      </div>
    );
  }

  const activeIndex = Math.max(0, availableLayers.findIndex((l) => l.id === activeLayerId));
  const activeLayer = availableLayers[activeIndex] ?? availableLayers[0];
  const ActivePanel = PANEL_COMPONENTS[activeLayer.id];

  function selectLayer(id) {
    setActiveLayerId(id);
    setExploded(false);
  }

  function handleWheel(e) {
    const dir = e.deltaY > 0 ? 1 : -1;
    const nextIndex = Math.min(availableLayers.length - 1, Math.max(0, activeIndex + dir));
    setActiveLayerId(availableLayers[nextIndex].id);
  }

  return (
    <div data-testid="xray-layers-viewport" onWheel={handleWheel} style={{display:"flex",flexDirection:"column",gap:12}}>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
        {availableLayers.map((layer) => (
          <button
            key={layer.id}
            onClick={() => selectLayer(layer.id)}
            style={{
              padding:"6px 12px",borderRadius:8,fontSize:12,fontFamily:T.sans,cursor:"pointer",
              border:`1px solid ${layer.id===activeLayer.id?T.accent:T.border}`,
              background:layer.id===activeLayer.id?T.accentDim:T.bg2,
              color:layer.id===activeLayer.id?T.text0:T.text1,
            }}
          >{layer.label}</button>
        ))}
        <button
          onClick={() => setExploded((v) => !v)}
          style={{marginLeft:"auto",padding:"6px 12px",borderRadius:8,fontSize:12,fontFamily:T.sans,cursor:"pointer",border:`1px solid ${T.border}`,background:T.bg2,color:T.text1}}
        >{exploded ? "Collapse" : "Explode"}</button>
      </div>
      {exploded ? (
        <div style={{position:"relative",height:340,perspective:1400}}>
          {availableLayers.map((layer, i) => {
            const Panel = PANEL_COMPONENTS[layer.id];
            const depth = availableLayers.length - 1 - i;
            return (
              <div
                key={layer.id}
                data-testid={`xray-layer-${layer.id}`}
                onClick={() => selectLayer(layer.id)}
                style={{
                  position:"absolute",inset:0,cursor:"pointer",
                  transform:`rotateX(6deg) rotateY(-10deg) translateZ(${-depth*40}px) translateX(${depth*24}px)`,
                  opacity:1-depth*0.12,
                  zIndex:availableLayers.length-depth,
                  transition:"transform .2s ease, opacity .2s ease",
                }}
              >
                <div style={{fontSize:10,color:T.text2,fontFamily:T.sans,marginBottom:4}}>{layer.label}</div>
                <div style={{maxHeight:260,overflow:"hidden"}}><Panel page={page} derived={derived} html={html} htmlFailed={htmlFailed}/></div>
              </div>
            );
          })}
        </div>
      ) : (
        <ActivePanel page={page} derived={derived} html={html} htmlFailed={htmlFailed}/>
      )}
    </div>
  );
}
