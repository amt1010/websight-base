import { useState, useEffect, useRef, useCallback } from "react";
import { T, fmt, trunc } from "../lib/theme";

const NODE_COLS=["#6366F1","#8B5CF6","#22D3EE","#10B981","#F59E0B","#EF4444","#EC4899","#06B6D4"];

function computePos(nodes,W,H){
  const cx=W/2,cy=H/2,pos={};
  const root=nodes.find(n=>!n.parent)||nodes[0];
  pos[root.id]={x:cx,y:cy};
  const L1=nodes.filter(n=>n.parent===root.id);
  L1.forEach((n,i)=>{
    const a=(2*Math.PI*i/L1.length)-Math.PI/2;
    pos[n.id]={x:cx+Math.round(W*.22*Math.cos(a)),y:cy+Math.round(H*.32*Math.sin(a))};
    nodes.filter(c=>c.parent===n.id).forEach((c,j,arr)=>{
      const sp=arr.length>1?.7:0;
      const a2=arr.length>1?a-sp/2+sp*j/(arr.length-1):a;
      pos[c.id]={x:Math.round(pos[n.id].x+70*Math.cos(a2)),y:Math.round(pos[n.id].y+62*Math.sin(a2))};
    });
  });
  return{pos,L1};
}

export function MindMap({nodes}){
  const svgRef=useRef(null);
  const[sc,setSc]=useState(1);const[off,setOff]=useState({x:0,y:0});
  const[hov,setHov]=useState(null);const[hovPx,setHovPx]=useState({x:0,y:0});
  const drag=useRef(false),last=useRef({x:0,y:0});
  const W=620,H=340;const{pos,L1}=computePos(nodes,W,H);
  function colOf(n){if(!n.parent)return"#F1F0FF";const i=L1.findIndex(l=>l.id===n.id||l.id===n.parent);return NODE_COLS[Math.abs(i)%NODE_COLS.length];}
  function rOf(n){return!n.parent?30:nodes.some(c=>c.parent===n.id)?20:13;}
  const onWheel=useCallback(e=>{e.preventDefault();setSc(s=>Math.min(3,Math.max(.3,s*(e.deltaY<0?1.1:.91))));},[]);
  useEffect(()=>{const el=svgRef.current;if(!el)return;el.addEventListener("wheel",onWheel,{passive:false});return()=>el.removeEventListener("wheel",onWheel);},[onWheel]);
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <span style={{fontSize:12,color:T.text2,fontFamily:T.body}}>{nodes.length} nodes · drag to pan · scroll to zoom</span>
        <div style={{display:"flex",gap:6}}>
          {[["＋",1.15],["－",.87]].map(([l,f])=><button key={l} onClick={()=>setSc(s=>Math.min(3,Math.max(.3,s*f)))} style={{padding:"4px 12px",background:"rgba(99,102,241,0.1)",border:`1px solid ${T.border}`,borderRadius:6,color:T.text1,cursor:"pointer",fontSize:13,fontFamily:T.sans}}>{l}</button>)}
          <button onClick={()=>{setSc(1);setOff({x:0,y:0});}} style={{padding:"4px 12px",background:"transparent",border:`1px solid ${T.border}`,borderRadius:6,color:T.text2,cursor:"pointer",fontSize:12,fontFamily:T.sans}}>Reset</button>
        </div>
      </div>
      <div style={{background:T.bg1,borderRadius:12,overflow:"hidden",height:340,position:"relative",border:`1px solid ${T.border}`,cursor:"grab"}}>
        <svg style={{position:"absolute",inset:0,width:"100%",height:"100%",opacity:.3}} xmlns="http://www.w3.org/2000/svg"><defs><pattern id="g" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill={T.text2}/></pattern></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>
        <svg ref={svgRef} width="100%" height="100%" viewBox={`0 0 ${W} ${H}`}
          onMouseDown={e=>{drag.current=true;last.current={x:e.clientX,y:e.clientY};}}
          onMouseMove={e=>{if(!drag.current)return;setOff(o=>({x:o.x+e.clientX-last.current.x,y:o.y+e.clientY-last.current.y}));last.current={x:e.clientX,y:e.clientY};}}
          onMouseUp={()=>{drag.current=false;}} onMouseLeave={()=>{drag.current=false;}}
          style={{position:"relative",zIndex:1}}>
          <g transform={`translate(${off.x},${off.y}) scale(${sc})`}>
            {nodes.map(n=>{if(!pos[n.id])return null;const par=nodes.find(x=>x.id===n.parent);if(!par||!pos[par.id])return null;const col=colOf(n);return<line key={"l"+n.id} x1={pos[par.id].x} y1={pos[par.id].y} x2={pos[n.id].x} y2={pos[n.id].y} stroke={col} strokeWidth={1} strokeOpacity={.35} strokeDasharray={nodes.some(c=>c.parent===n.id)?"":"3,3"}/>;
            })}
            {nodes.map(n=>{if(!pos[n.id])return null;const r=rOf(n),col=colOf(n),lbl=trunc(n.label,9),isR=!n.parent;return(
              <g key={n.id} style={{cursor:"pointer"}} onMouseEnter={e=>{setHov(n);const rc=svgRef.current.getBoundingClientRect();setHovPx({x:e.clientX-rc.left+12,y:e.clientY-rc.top-44});}} onMouseLeave={()=>setHov(null)}>
                <circle cx={pos[n.id].x} cy={pos[n.id].y} r={r+4} fill={col} opacity={.08}/>
                <circle cx={pos[n.id].x} cy={pos[n.id].y} r={r} fill={isR?"#1C1D35":T.bg2} stroke={col} strokeWidth={isR?2:1.5}/>
                <text x={pos[n.id].x} y={pos[n.id].y-(n.count>1&&r>14?4:0)} textAnchor="middle" dominantBaseline="middle" fill={isR?T.text0:col} fontSize={r>22?10:8} fontWeight="600" fontFamily={T.sans}>{lbl}</text>
                {n.count>1&&<text x={pos[n.id].x} y={pos[n.id].y+(r>14?r-3:r-2)} textAnchor="middle" fill={col} fontSize={7} opacity={.7} fontFamily={T.mono}>{fmt(n.count)}</text>}
              </g>);})}
          </g>
        </svg>
        {hov&&<div style={{position:"absolute",left:hovPx.x,top:hovPx.y,background:T.card,border:`1px solid ${T.border}`,borderRadius:8,padding:"6px 12px",fontSize:12,pointerEvents:"none",zIndex:9,color:T.text0,fontFamily:T.sans,whiteSpace:"nowrap",backdropFilter:"blur(8px)"}}><strong>{hov.label}</strong> <span style={{color:T.text2,marginLeft:8}}>{hov.count.toLocaleString()} pages</span></div>}
      </div>
    </div>
  );
}
