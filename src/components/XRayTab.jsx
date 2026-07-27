import { useState, useEffect, useRef } from "react";
import { T, hex2rgb } from "../lib/theme";
import { XRAY_PAGES, LAYER_META, getLayerContent } from "../lib/xrayContent";

export function XRayTab() {
  const [page, setPage] = useState("physician");
  const [activeLayer, setActiveLayer] = useState(1);
  const [exploded, setExploded] = useState(false);
  const [zoom, setZoom] = useState(1);
  const containerRef = useRef(null);
  const viewportRef = useRef(null);

  // Keyboard: Space to explode, Enter to reset
  useEffect(() => {
    function handleKey(e) {
      if (e.code === "Space" && containerRef.current && containerRef.current.matches(":hover")) {
        e.preventDefault();
        setExploded(v => !v);
      }
      if (e.code === "Enter" && containerRef.current && containerRef.current.matches(":hover")) {
        e.preventDefault();
        setActiveLayer(1);
        setExploded(false);
        setZoom(1);
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  // Mouse wheel: scroll through layers 1–6
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    let cooldown = false;
    function handleWheel(e) {
      e.preventDefault();
      if (cooldown) return;
      cooldown = true;
      setTimeout(() => { cooldown = false; }, 250);
      if (e.deltaY > 0) {
        setActiveLayer(prev => Math.min(6, prev + 1));
        setExploded(false);
      } else if (e.deltaY < 0) {
        setActiveLayer(prev => Math.max(1, prev - 1));
        setExploded(false);
      }
    }
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, []);

  function renderLayer(layerNum) {
    const {type, content} = getLayerContent(page, layerNum);
    const layerColor = LAYER_META[layerNum - 1].color;
    if (type === "visual") { const C = content; return <C />; }
    if (type === "code" || type === "api" || type === "data") {
      return (
        <pre style={{fontFamily:T.mono,fontSize:11,lineHeight:1.5,color:layerColor,whiteSpace:"pre-wrap",wordBreak:"break-all",margin:0,padding:"16px 20px"}}>{content}</pre>
      );
    }
    // text
    return (
      <pre style={{fontFamily:"'Inter',sans-serif",fontSize:13,lineHeight:1.7,color:T.text1,whiteSpace:"pre-wrap",margin:0,padding:"16px 20px"}}>{content}</pre>
    );
  }

  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}} ref={containerRef}>
      {/* toolbar */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
        <div style={{display:"flex",gap:6}}>
          {XRAY_PAGES.map(p=>(
            <button key={p.id} onClick={()=>{setPage(p.id);setActiveLayer(1);setExploded(false);}}
              style={{padding:"6px 14px",borderRadius:7,border:page===p.id?`1.5px solid ${T.accent}`:`1px solid ${T.border}`,background:page===p.id?T.accentDim:"transparent",color:page===p.id?T.text0:T.text1,fontSize:12,fontFamily:T.sans,fontWeight:page===p.id?600:400,cursor:"pointer"}}>
              {p.label}
            </button>
          ))}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:11,color:T.text2,fontFamily:T.body}}>Scroll to navigate layers</span>
          <span style={{fontSize:11,color:T.text2,fontFamily:T.body}}>Spacebar to explode</span>
          <span style={{fontSize:11,color:T.text2,fontFamily:T.body}}>Enter to reset</span>
          <div style={{display:"flex",gap:4}}>
            {[["＋",()=>setZoom(z=>Math.min(2,z+.15))],["－",()=>setZoom(z=>Math.max(.5,z-.15))]].map(([l,fn])=>(
              <button key={l} onClick={fn} style={{padding:"3px 10px",background:T.accentDim,border:`1px solid ${T.border}`,borderRadius:5,color:T.text1,cursor:"pointer",fontSize:13,fontFamily:T.sans}}>{l}</button>
            ))}
          </div>
        </div>
      </div>

      {/* layer toggle buttons */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}>
        <div style={{fontSize:13,color:T.text1,fontFamily:T.mono}}>
          {XRAY_PAGES.find(p=>p.id===page)?.path}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:4}}>
          <span style={{fontSize:11,color:T.text2,fontFamily:T.body,marginRight:6}}>Toggle layers</span>
          {LAYER_META.map(l=>(
            <button key={l.num} onClick={()=>{setActiveLayer(l.num);setExploded(false);}}
              style={{width:28,height:28,borderRadius:5,border:activeLayer===l.num?`2px solid ${l.color}`:`1px solid rgba(255,255,255,0.15)`,background:activeLayer===l.num?`rgba(${hex2rgb(l.color)},0.25)`:"rgba(255,255,255,0.05)",color:activeLayer===l.num?"#fff":T.text2,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:T.sans,display:"flex",alignItems:"center",justifyContent:"center"}}>
              {l.num}
            </button>
          ))}
        </div>
      </div>

      {/* layer label + progress track */}
      <div style={{display:"flex",alignItems:"center",gap:10,justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:10,height:10,borderRadius:2,background:LAYER_META[activeLayer-1].color,transition:"background .2s"}}/>
          <span style={{fontSize:14,fontWeight:600,color:LAYER_META[activeLayer-1].color,fontFamily:T.sans,transition:"color .2s"}}>
            Layer {activeLayer}: {LAYER_META[activeLayer-1].label}
          </span>
          <span style={{fontSize:12,color:T.text2,fontFamily:T.body}}>— {LAYER_META[activeLayer-1].desc}</span>
        </div>
        {/* dot progress */}
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          {LAYER_META.map(l => (
            <div key={l.num} onClick={()=>{setActiveLayer(l.num);setExploded(false);}}
              style={{width:activeLayer===l.num?24:8,height:8,borderRadius:4,
                background:activeLayer===l.num?l.color:`rgba(255,255,255,0.1)`,
                transition:"all .25s cubic-bezier(0.4,0,0.2,1)",cursor:"pointer",
                boxShadow:activeLayer===l.num?`0 0 8px rgba(${hex2rgb(l.color)},0.5)`:""}}/>
          ))}
          <span style={{fontSize:10,color:T.text2,fontFamily:T.mono,marginLeft:4}}>{activeLayer}/6</span>
        </div>
      </div>

      {/* ── Main viewport: exploded or single-layer ─── */}
      <div ref={viewportRef} style={{cursor:"ns-resize"}}>
      {exploded ? (
        <div style={{perspective:1200,perspectiveOrigin:"50% 40%",position:"relative",height:480,overflow:"hidden",background:T.bg1,borderRadius:12,border:`1px solid ${T.border}`}}>
          {LAYER_META.map((l,i)=>{
            const zOff = (i - 2.5) * 90;
            return (
              <div key={l.num} onClick={()=>{setActiveLayer(l.num);setExploded(false);}}
                style={{position:"absolute",top:20,left:20,right:20,height:400,
                  transform:`translate3d(0px, ${i*8}px, ${zOff}px) scale3d(${0.92-i*0.01}, ${0.92-i*0.01}, 1) rotateX(15deg)`,
                  transition:"all 0.5s cubic-bezier(0.25,0.46,0.45,0.94)",
                  background:T.bg0,border:`1.5px solid rgba(${hex2rgb(l.color)},0.5)`,borderRadius:10,
                  overflow:"hidden",cursor:"pointer",opacity:0.85+i*0.03,
                  boxShadow:`0 4px 24px rgba(${hex2rgb(l.color)},0.15)`,
                  zIndex:6-i}}>
                {/* layer header */}
                <div style={{background:`rgba(${hex2rgb(l.color)},0.12)`,borderBottom:`1px solid rgba(${hex2rgb(l.color)},0.3)`,padding:"6px 14px",display:"flex",alignItems:"center",gap:8}}>
                  <div style={{width:18,height:18,borderRadius:4,background:l.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"#fff"}}>{l.num}</div>
                  <span style={{fontSize:12,fontWeight:600,color:l.color,fontFamily:T.sans}}>{l.label}</span>
                  <span style={{fontSize:11,color:T.text2,fontFamily:T.body}}>— {l.desc}</span>
                </div>
                <div style={{overflow:"hidden",maxHeight:360}}>
                  {renderLayer(l.num)}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{background:T.bg0,borderRadius:12,border:`1px solid rgba(${hex2rgb(LAYER_META[activeLayer-1].color)},0.4)`,overflow:"hidden",boxShadow:`0 0 40px rgba(${hex2rgb(LAYER_META[activeLayer-1].color)},0.08)`,transform:`scale(${zoom})`,transformOrigin:"top center",transition:"transform 0.2s"}}>
          {/* browser chrome */}
          <div style={{background:"#1A1B2C",padding:"8px 14px",display:"flex",alignItems:"center",gap:8,borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
            <div style={{display:"flex",gap:6}}>{["#FF5F57","#FEBC2E","#28C840"].map(c=><div key={c} style={{width:11,height:11,borderRadius:"50%",background:c}}/>)}</div>
            <div style={{flex:1,background:"rgba(255,255,255,0.05)",borderRadius:6,padding:"4px 12px",fontSize:11,color:T.text2,fontFamily:T.mono,marginLeft:6}}>
              bswhealth.com{XRAY_PAGES.find(p=>p.id===page)?.path}
            </div>
            <div style={{display:"flex",gap:6,alignItems:"center"}}>
              <span style={{fontSize:10,fontFamily:T.body,background:`rgba(${hex2rgb(LAYER_META[activeLayer-1].color)},0.15)`,padding:"2px 8px",borderRadius:4,border:`1px solid rgba(${hex2rgb(LAYER_META[activeLayer-1].color)},0.3)`,color:LAYER_META[activeLayer-1].color}}>
                Layer {activeLayer}
              </span>
            </div>
          </div>
          {/* scan lines overlay for non-visual layers */}
          <div style={{position:"relative"}}>
            {activeLayer > 1 && <div style={{position:"absolute",inset:0,backgroundImage:"repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(255,255,255,0.012) 3px,rgba(255,255,255,0.012) 4px)",pointerEvents:"none",zIndex:3}}/>}
            <div style={{maxHeight:440,overflowY:"auto"}}>
              {renderLayer(activeLayer)}
            </div>
          </div>
        </div>
      )}
      </div>

      {/* bottom legend */}
      <div style={{display:"flex",flexWrap:"wrap",gap:12,justifyContent:"center",padding:"8px 0"}}>
        {LAYER_META.map(l=>(
          <button key={l.num} onClick={()=>{setActiveLayer(l.num);setExploded(false);}}
            style={{display:"flex",alignItems:"center",gap:6,fontSize:11,color:activeLayer===l.num?l.color:T.text2,fontFamily:T.body,background:"transparent",border:"none",cursor:"pointer",padding:"4px 8px",borderRadius:5,transition:"all .15s"}}>
            <div style={{width:8,height:8,borderRadius:2,background:l.color,opacity:activeLayer===l.num?1:0.4}}/>
            {l.label}
          </button>
        ))}
        <button onClick={()=>setExploded(v=>!v)}
          style={{fontSize:11,color:exploded?T.accent:T.text2,fontFamily:T.body,background:exploded?T.accentDim:"transparent",border:`1px solid ${exploded?T.accent:T.border}`,cursor:"pointer",padding:"4px 12px",borderRadius:5}}>
          {exploded?"⟵ Collapse":"⟶ Explode all layers"}
        </button>
      </div>
    </div>
  );
}
