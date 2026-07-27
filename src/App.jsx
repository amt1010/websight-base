import { useState, useEffect, useRef, useCallback } from "react";

// ── Fonts ─────────────────────────────────────────────────────────────────────
const Fonts = () => <style>{`@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Inter:wght@300;400;500&family=JetBrains+Mono:wght@400;500&display=swap');`}</style>;

// ── Design tokens ─────────────────────────────────────────────────────────────
const T = {
  bg0:"#07080F", bg1:"#0D0E1A", bg2:"#12131F", bg3:"#181928", card:"#1A1B2E",
  border:"rgba(99,102,241,0.15)", borderHover:"rgba(99,102,241,0.4)",
  accent:"#6366F1", accentDim:"rgba(99,102,241,0.12)", violet:"#8B5CF6",
  cyan:"#22D3EE", green:"#10B981", amber:"#F59E0B", red:"#EF4444",
  text0:"#F1F0FF", text1:"#A8A9C0", text2:"#5C5E78",
  mono:"'JetBrains Mono', monospace", sans:"'Space Grotesk', sans-serif", body:"'Inter', sans-serif",
};
function hex2rgb(h){const r=parseInt(h.slice(1,3),16),g=parseInt(h.slice(3,5),16),b=parseInt(h.slice(5,7),16);return`${r},${g},${b}`;}
function pct(c,t){return Math.round(c/t*100);}
function fmt(n){return n>=1000?(n/1000).toFixed(1)+"k":String(n);}
function trunc(s,n){return s.length>n?s.slice(0,n)+"…":s;}

// ── Shared UI ─────────────────────────────────────────────────────────────────
const Badge=({label,color="#6366F1",dim=false})=>(
  <span style={{fontSize:11,padding:"2px 8px",borderRadius:20,fontFamily:T.sans,fontWeight:500,background:`rgba(${hex2rgb(color)},${dim?0.12:0.2})`,color,border:`1px solid rgba(${hex2rgb(color)},0.3)`}}>{label}</span>
);
const Chip=({label})=>(
  <span style={{fontSize:11,padding:"3px 9px",borderRadius:5,fontFamily:T.mono,background:"rgba(255,255,255,0.04)",border:`1px solid ${T.border}`,color:T.text1}}>{label}</span>
);

// ── BSW Data ──────────────────────────────────────────────────────────────────
const BSW = {
  domain:"bswhealth.com", title:"Baylor Scott & White Health",
  industry:"Healthcare System · Texas", crawledAt:"June 15, 2026 · 14:32 UTC",
  summary:"Texas's largest not-for-profit healthcare system — hospitals, clinics, physician offices and virtual care. Every provider profile, location listing and specialty page is hydrated at load time from third-party APIs (Epic, Phynd, Google Maps) inside a Sitecore XM Cloud headless CMS.",
  tags:["healthcare","hospital network","telehealth","patient portal","multi-location","not-for-profit","HIPAA"],
  tech:["Sitecore XM Cloud","Next.js Headless","Epic / MyChart","Google Tag Manager","Azure Blob CDN","Google Maps Places API","Phynd NPI"],
  metrics:{pages:12000,sections:11,templates:5,apis:4,crawlTime:"3.2s"},
  nodes:[
    {id:"home",label:"Home",parent:null,count:1},{id:"physicians",label:"Physicians",parent:"home",count:4200},
    {id:"allied",label:"Allied Health",parent:"home",count:1800},{id:"locations",label:"Locations",parent:"home",count:744},
    {id:"blog",label:"Blog / News",parent:"home",count:2200},{id:"specialties",label:"Specialties",parent:"home",count:180},
    {id:"np",label:"Nurse Practitioners",parent:"physicians",count:900},{id:"pa",label:"Physician Asst",parent:"physicians",count:600},
    {id:"therapists",label:"Therapists",parent:"allied",count:120},{id:"dieticians",label:"Dieticians",parent:"allied",count:80},
    {id:"audiologists",label:"Audiologists",parent:"allied",count:40},{id:"clinics",label:"Clinics",parent:"locations",count:500},
    {id:"hospitals",label:"Hospitals",parent:"locations",count:52},{id:"virtual",label:"Virtual Care",parent:"specialties",count:12},
  ],
  templates:[
    {id:"tp1",name:"Physician / Provider Profile",count:7500,total:12000,pattern:"/physician/* · /nurse-practitioner/*",color:"#6366F1",
      features:["Photo & bio","Specialties & languages","Insurance list","Epic scheduling widget","Real-time availability","Distance from user"],apis:["Phynd","Epic"],
      layers:[
        {label:"Nav bar (static CMS)",h:48,color:"#334155",api:null},
        {label:"Hero — name, photo, credentials",h:96,color:"#6366F1",api:"Phynd Provider API"},
        {label:"Bio + specialties + languages",h:72,color:"#6366F1",api:"Phynd Provider API"},
        {label:"Open scheduling widget (real-time slots)",h:88,color:"#10B981",api:"Epic Open Scheduling"},
        {label:"Insurance accepted",h:52,color:"#6366F1",api:"Phynd Provider API"},
        {label:"Location map",h:64,color:"#22D3EE",api:"Google Maps Places"},
        {label:"Footer (static CMS)",h:40,color:"#334155",api:null},
      ]},
    {id:"tp2",name:"Doctor Search / Filter",count:80,total:12000,pattern:"/doctors/{specialty}?distance=&sortBy=&keyword=",color:"#8B5CF6",
      features:["Geo-filtered results","Specialty filter","Sort by availability","Phynd/NPI data"],apis:["Phynd"],
      layers:[
        {label:"Nav bar (static CMS)",h:48,color:"#334155",api:null},
        {label:"Specialty heading + breadcrumb",h:52,color:"#334155",api:null},
        {label:"Provider result cards",h:140,color:"#6366F1",api:"Phynd Provider API"},
        {label:"Filter sidebar — distance, availability",h:88,color:"#6366F1",api:"Phynd Provider API"},
        {label:"Pagination / load more",h:36,color:"#334155",api:null},
        {label:"Footer (static CMS)",h:40,color:"#334155",api:null},
      ]},
    {id:"tp3",name:"Location / Clinic Finder",count:744,total:12000,pattern:"/locations/clinic · /locations/hospital",color:"#22D3EE",
      features:["Google Maps pins","Hours & walk-in","Services offered","Azure photo CDN"],apis:["Geo API","Google Maps"],
      layers:[
        {label:"Nav bar (static CMS)",h:48,color:"#334155",api:null},
        {label:"Search + geo filter bar",h:56,color:"#22D3EE",api:"Location Geo API"},
        {label:"744 clinic cards (Azure photos)",h:128,color:"#22D3EE",api:"Location Geo API"},
        {label:"Google Maps pin map",h:110,color:"#22D3EE",api:"Google Maps Places"},
        {label:"Hours & walk-in status",h:48,color:"#22D3EE",api:"Location Geo API"},
        {label:"Footer (static CMS)",h:40,color:"#334155",api:null},
      ]},
    {id:"tp4",name:"Blog / Health Article",count:2200,total:12000,pattern:"/news/* · /blog/* · /resources/*",color:"#F59E0B",
      features:["Author attribution","Category tags","Related articles","SEO meta"],apis:[],
      layers:[
        {label:"Nav bar (static CMS)",h:48,color:"#334155",api:null},
        {label:"Hero image + title",h:100,color:"#F59E0B",api:null},
        {label:"Article body (CMS rich text)",h:180,color:"#334155",api:null},
        {label:"Author card + tags",h:52,color:"#F59E0B",api:null},
        {label:"Related articles widget",h:72,color:"#334155",api:null},
        {label:"Footer (static CMS)",h:40,color:"#334155",api:null},
      ]},
    {id:"tp5",name:"Specialty / Service Page",count:180,total:12000,pattern:"/specialties/* · /treatments-and-procedures/*",color:"#10B981",
      features:["Condition overview","Find a Doctor CTA","Related locations"],apis:["Phynd"],
      layers:[
        {label:"Nav bar (static CMS)",h:48,color:"#334155",api:null},
        {label:"Specialty hero (CMS)",h:80,color:"#10B981",api:null},
        {label:"Condition overview (CMS)",h:100,color:"#334155",api:null},
        {label:"Find a Doctor CTA → Phynd query",h:60,color:"#6366F1",api:"Phynd Provider API"},
        {label:"Related locations",h:56,color:"#22D3EE",api:"Location Geo API"},
        {label:"Footer (static CMS)",h:40,color:"#334155",api:null},
      ]},
  ],
  apis:[
    {name:"Phynd Provider Directory API",type:"Healthcare · Provider Data",confidence:"High",color:"#6366F1",
      endpoints:["/physician/{slug}","/doctors/{specialty}?distance=&sortBy=&keyword="],
      purpose:"Serves all provider profile data — NPI numbers, specialties, languages, insurance accepted, photo, bio, geo-distance.",
      method:"REST / JSON — headless CMS hydration at edge",trigger:"Page load · filter/sort · specialty search"},
    {name:"Epic Open Scheduling API",type:"Booking · EHR Integration",confidence:"High",color:"#10B981",
      endpoints:["openSchedule JSON in /physician/* page meta","visitTypeId · departmentId · providerEpicId"],
      purpose:"Returns real-time appointment slot availability by provider, visit type and department. Pre-fetched into page meta on load.",
      method:"Epic FHIR / proprietary JSON",trigger:"Page load → Schedule button"},
    {name:"Location Search & Geo API",type:"Geolocation · Facility Data",confidence:"High",color:"#22D3EE",
      endpoints:["/locations/clinic · /locations/hospital","Google Maps place_id","bswmedia.blob.core.windows.net"],
      purpose:"Loads 744+ clinic records geo-filtered by user location with walk-in status, hours, and map pins.",
      method:"REST + Google Maps Places + Azure Blob CDN",trigger:"Page load · geo-permission · filter"},
    {name:"Google Tag Manager (first-party)",type:"Analytics · Tag Management",confidence:"High",color:"#F59E0B",
      endpoints:["gtm.bswhealth.com (GTM-PGCTTH)","gtm_auth token"],
      purpose:"Manages all tracking — GA4, pixels, A/B tests, chat widgets. Custom subdomain for first-party data strategy.",
      method:"JS tag injection via GTM container",trigger:"Every page load + interaction events"},
  ],
  projects:[
    {id:1,name:"bswhealth.com",pages:12000,status:"done",date:"Today, 14:32",score:94},
    {id:2,name:"crystalgolfresort.com",pages:312,status:"done",date:"Yesterday",score:78},
    {id:3,name:"mybswhealth.com",pages:840,status:"queued",date:"Queued",score:null},
  ],
};

// ── MindMap ───────────────────────────────────────────────────────────────────
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
  return{pos,root,L1};
}
function MindMap({nodes}){
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

// ══════════════════════════════════════════════════════════════════════════════
// ── X-RAY TAB — TranslucentWeb-style 6-layer exploded view ───────────────────
// ══════════════════════════════════════════════════════════════════════════════

const XRAY_PAGES = [
  { id:"physician", label:"Physician Profile", path:"/physician/jun-kong" },
  { id:"doctor-search", label:"Doctor Search", path:"/doctors/family-medicine" },
  { id:"location", label:"Clinic Finder", path:"/locations/clinic" },
];

const LAYER_META = [
  { num:1, label:"Visual Render",    desc:"What the user sees",       color:"#22D3EE" },
  { num:2, label:"Content / Text",   desc:"Raw text content layer",   color:"#A8A9C0" },
  { num:3, label:"HTML / DOM",       desc:"Document structure",       color:"#F59E0B" },
  { num:4, label:"CSS / Styles",     desc:"Styling & layout rules",   color:"#EC4899" },
  { num:5, label:"Network / APIs",   desc:"API requests & responses", color:"#6366F1" },
  { num:6, label:"Data / Schema",    desc:"Underlying data model",    color:"#10B981" },
];

// Layer content for the physician profile page
function getLayerContent(pageId, layerNum) {
  if (pageId === "physician") {
    switch(layerNum) {
      case 1: return {type:"visual", content: physicianVisualLayer};
      case 2: return {type:"text", content: physicianTextLayer};
      case 3: return {type:"code", lang:"html", content: physicianHTMLLayer};
      case 4: return {type:"code", lang:"css", content: physicianCSSLayer};
      case 5: return {type:"api", content: physicianAPILayer};
      case 6: return {type:"data", content: physicianDataLayer};
      default: return {type:"text", content:""};
    }
  }
  if (pageId === "doctor-search") {
    switch(layerNum) {
      case 1: return {type:"visual", content: searchVisualLayer};
      case 2: return {type:"text", content: searchTextLayer};
      case 3: return {type:"code", lang:"html", content: searchHTMLLayer};
      case 4: return {type:"code", lang:"css", content: searchCSSLayer};
      case 5: return {type:"api", content: searchAPILayer};
      case 6: return {type:"data", content: searchDataLayer};
      default: return {type:"text", content:""};
    }
  }
  // location
  switch(layerNum) {
    case 1: return {type:"visual", content: locationVisualLayer};
    case 2: return {type:"text", content: locationTextLayer};
    case 3: return {type:"code", lang:"html", content: locationHTMLLayer};
    case 4: return {type:"code", lang:"css", content: locationCSSLayer};
    case 5: return {type:"api", content: locationAPILayer};
    case 6: return {type:"data", content: locationDataLayer};
    default: return {type:"text", content:""};
  }
}

// ── Physician page layers ────────────────────────────────────────────────────

const physicianVisualLayer = () => (
  <div style={{fontFamily:"'Inter',sans-serif",color:"#1a1a2e"}}>
    <div style={{background:"#003C71",padding:"12px 20px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <span style={{color:"#fff",fontWeight:700,fontSize:14}}>Baylor Scott & White Health</span>
      <div style={{display:"flex",gap:16}}>{["Find a Doctor","Locations","Services","MyBSWHealth"].map(l=><span key={l} style={{color:"rgba(255,255,255,.8)",fontSize:12}}>{l}</span>)}</div>
    </div>
    <div style={{padding:"20px 24px",display:"flex",gap:20}}>
      <div style={{width:90,height:110,borderRadius:10,background:"linear-gradient(135deg,#6366F1,#8B5CF6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:32,color:"#fff",flexShrink:0}}>JK</div>
      <div style={{flex:1}}>
        <div style={{fontSize:18,fontWeight:700,color:"#003C71",marginBottom:2}}>Jun Kong, MD</div>
        <div style={{fontSize:13,color:"#555",marginBottom:8}}>Internal Medicine · Gastroenterology</div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
          {["Accepting New Patients","Video Visits Available"].map(b=><span key={b} style={{fontSize:11,padding:"3px 8px",borderRadius:4,background:"#E8F5E9",color:"#2E7D32"}}>{b}</span>)}
        </div>
        <div style={{background:"#F5F5F5",borderRadius:8,padding:12,marginBottom:10}}>
          <div style={{fontSize:12,fontWeight:600,color:"#333",marginBottom:6}}>Next available appointments</div>
          <div style={{display:"flex",gap:8}}>
            {[{d:"Mon, Jun 16",t:"9:30 AM"},{d:"Mon, Jun 16",t:"2:15 PM"},{d:"Tue, Jun 17",t:"10:00 AM"}].map((s,i)=>(
              <div key={i} style={{flex:1,background:"#fff",borderRadius:6,padding:8,border:"1px solid #e0e0e0",textAlign:"center"}}>
                <div style={{fontSize:11,color:"#666"}}>{s.d}</div>
                <div style={{fontSize:13,fontWeight:600,color:"#003C71"}}>{s.t}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{fontSize:12,color:"#555",lineHeight:1.6}}>
          <strong style={{color:"#333"}}>Languages:</strong> English, Mandarin &nbsp;|&nbsp;
          <strong style={{color:"#333"}}>Insurance:</strong> Aetna, Blue Cross, Cigna, Medicare, United
        </div>
      </div>
    </div>
    <div style={{background:"#f9f9f9",padding:"12px 24px",borderTop:"1px solid #e8e8e8"}}>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <div style={{width:120,height:70,borderRadius:6,background:"#dbeafe",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:"#3b82f6"}}>📍 Map</div>
        <div style={{fontSize:12,color:"#555"}}>BSW Clinic — 3600 Gaston Ave, Dallas, TX 75246<br/><span style={{color:"#003C71",fontWeight:500}}>Get Directions</span></div>
      </div>
    </div>
  </div>
);

const physicianTextLayer = `Jun Kong, MD

Internal Medicine · Gastroenterology
Accepting New Patients
Video Visits Available

Next available appointments:
  Mon, Jun 16 — 9:30 AM
  Mon, Jun 16 — 2:15 PM
  Tue, Jun 17 — 10:00 AM

Languages: English, Mandarin
Insurance: Aetna, Blue Cross, Cigna, Medicare, United

NPI: 1234567890
Board Certified: American Board of Internal Medicine

BSW Clinic — 3600 Gaston Ave, Dallas, TX 75246
Phone: (214) 820-0111
Fax: (214) 820-0112
Hours: Mon-Fri 8:00 AM - 5:00 PM`;

const physicianHTMLLayer = `<main class="provider-profile">
  <nav class="bsw-header">
    <a href="/" class="logo">Baylor Scott & White</a>
    <ul class="nav-links">
      <li><a href="/doctors">Find a Doctor</a></li>
      <li><a href="/locations">Locations</a></li>
    </ul>
  </nav>

  <section class="provider-hero">
    <img src="/media/providers/jun-kong.jpg"
         alt="Jun Kong, MD" class="provider-photo" />
    <div class="provider-info">
      <h1>Jun Kong, MD</h1>
      <p class="specialty">Internal Medicine · Gastro</p>
      <div class="badges">
        <span class="badge green">Accepting New Patients</span>
        <span class="badge green">Video Visits</span>
      </div>
    </div>
  </section>

  <section class="scheduling-widget"
    data-provider-epic-id="EPRV42819"
    data-department-id="10301022"
    data-visit-types="NEW,RETURN,VIDEO">
    <!-- Epic OpenScheduling embed -->
    <div class="slot" data-time="2026-06-16T09:30">
    <div class="slot" data-time="2026-06-16T14:15">
    <div class="slot" data-time="2026-06-17T10:00">
  </section>

  <section class="insurance-list">
    <!-- Phynd API → insurance[] -->
  </section>

  <section class="location-map"
    data-place-id="ChIJx5DG1a2ZToYR...">
    <!-- Google Maps embed -->
  </section>
</main>`;

const physicianCSSLayer = `.provider-profile {
  font-family: 'Inter', system-ui, sans-serif;
  color: #1a1a2e;
}

.bsw-header {
  background: #003C71;
  padding: 12px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.provider-hero {
  display: flex;
  gap: 20px;
  padding: 24px;
}

.provider-photo {
  width: 120px;
  height: 140px;
  border-radius: 12px;
  object-fit: cover;
}

.provider-info h1 {
  font-size: 22px;
  font-weight: 700;
  color: #003C71;
}

.scheduling-widget {
  background: #F5F5F5;
  border-radius: 12px;
  padding: 16px;
}

.slot {
  background: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 10px;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.15s;
}

.slot:hover {
  border-color: #003C71;
}

.badge.green {
  background: #E8F5E9;
  color: #2E7D32;
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 4px;
}

.location-map {
  height: 200px;
  background: #dbeafe;
}`;

const physicianAPILayer = `╔══════════════════════════════════════════════════╗
║  NETWORK REQUEST LOG — /physician/jun-kong       ║
╚══════════════════════════════════════════════════╝

──── REQUEST 1: Phynd Provider API ────────────────
URL:    https://api.phynd.com/v2/providers/npi/1234567890
Method: GET
Status: 200 OK
Type:   application/json; charset=utf-8
Size:   2,847 bytes
Time:   142ms

{
  "npi": "1234567890",
  "name": { "first": "Jun", "last": "Kong" },
  "degree": "MD",
  "specialties": [
    { "name": "Internal Medicine", "board_certified": true },
    { "name": "Gastroenterology", "board_certified": true }
  ],
  "languages": ["English", "Mandarin"],
  "insurance_accepted": [
    "Aetna", "Blue Cross", "Cigna", "Medicare", "United"
  ],
  "accepting_new_patients": true,
  "video_visits": true,
  "photo_url": "/media/providers/jun-kong.jpg",
  "locations": [
    {
      "name": "BSW Clinic",
      "address": "3600 Gaston Ave, Dallas, TX 75246",
      "phone": "(214) 820-0111",
      "google_place_id": "ChIJx5DG1a2ZToYR..."
    }
  ]
}

──── REQUEST 2: Epic Open Scheduling ──────────────
URL:    https://epicproxy.bswhealth.com/fhir/Slot
        ?provider=EPRV42819&department=10301022
Method: GET     Status: 200 OK
Size:   1,204 bytes    Time: 98ms

{
  "available_slots": [
    { "start": "2026-06-16T09:30", "type": "NEW_PATIENT" },
    { "start": "2026-06-16T14:15", "type": "RETURN" },
    { "start": "2026-06-17T10:00", "type": "VIDEO" }
  ],
  "provider_epic_id": "EPRV42819",
  "department_id": "10301022"
}

──── REQUEST 3: GTM (analytics) ───────────────────
URL:    https://gtm.bswhealth.com/gtm.js?id=GTM-PGCTTH
Method: GET     Status: 200 OK
Size:   84,221 bytes   Time: 45ms`;

const physicianDataLayer = `Table: providers
+──────────+──────────────+──────────────+──────────────────+──────────────+
| npi      | first_name   | last_name    | specialty        | degree       |
+──────────+──────────────+──────────────+──────────────────+──────────────+
| 12345678 | Jun          | Kong         | Internal Med     | MD           |
| 12345679 | Sarah        | Chen         | Cardiology       | MD           |
| 12345680 | Michael      | Torres       | Family Medicine  | DO           |
| 12345681 | Priya        | Patel        | Pediatrics       | MD           |
| 12345682 | James        | Williams     | Orthopedics      | MD           |
+──────────+──────────────+──────────────+──────────────────+──────────────+

Table: appointments (Epic FHIR Slot resource)
+──────────+──────────────────────+───────────────+──────────────+
| slot_id  | start_time           | visit_type    | provider_npi |
+──────────+──────────────────────+───────────────+──────────────+
| SLT-4281 | 2026-06-16T09:30:00  | NEW_PATIENT   | 12345678     |
| SLT-4282 | 2026-06-16T14:15:00  | RETURN        | 12345678     |
| SLT-4283 | 2026-06-17T10:00:00  | VIDEO         | 12345678     |
| SLT-4290 | 2026-06-17T11:00:00  | NEW_PATIENT   | 12345679     |
+──────────+──────────────────────+───────────────+──────────────+

Table: locations
+──────────+──────────────────────+───────────────────────────+──────────+
| loc_id   | name                 | address                   | place_id |
+──────────+──────────────────────+───────────────────────────+──────────+
| LOC-0301 | BSW Clinic Gaston    | 3600 Gaston Ave, Dallas   | ChIJx5D… |
| LOC-0302 | BSW Medical Center   | 1201 Pennsylvania, FW     | ChIJy3F… |
+──────────+──────────────────────+───────────────────────────+──────────+`;

// ── Search page layers (abbreviated) ────────────
const searchVisualLayer = () => (
  <div style={{fontFamily:"'Inter',sans-serif",color:"#1a1a2e"}}>
    <div style={{background:"#003C71",padding:"12px 20px"}}><span style={{color:"#fff",fontWeight:700,fontSize:14}}>Baylor Scott & White Health</span></div>
    <div style={{padding:"16px 24px"}}>
      <div style={{fontSize:16,fontWeight:700,color:"#003C71",marginBottom:8}}>Family Medicine Doctors</div>
      <div style={{display:"flex",gap:8,marginBottom:16}}>
        {["Distance: 25mi","Sort: Next Available","Keyword: Family Medicine"].map(f=><span key={f} style={{fontSize:11,padding:"4px 8px",borderRadius:4,background:"#EDE9FE",color:"#6366F1"}}>{f}</span>)}
      </div>
      {[{n:"Dr. Sarah Chen",s:"Family Medicine",a:"Mon 9:00 AM"},{n:"Dr. Michael Torres",s:"Family Medicine",a:"Tue 10:30 AM"},{n:"Dr. Priya Patel",s:"Family Medicine",a:"Wed 8:00 AM"}].map((d,i)=>(
        <div key={i} style={{display:"flex",gap:12,padding:"12px",borderBottom:"1px solid #eee",alignItems:"center"}}>
          <div style={{width:40,height:40,borderRadius:20,background:"#6366F1",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:12,fontWeight:700,flexShrink:0}}>{d.n.split(" ").map(w=>w[0]).join("").slice(0,2)}</div>
          <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600}}>{d.n}</div><div style={{fontSize:11,color:"#666"}}>{d.s}</div></div>
          <div style={{fontSize:11,color:"#003C71",fontWeight:500}}>{d.a}</div>
        </div>
      ))}
    </div>
  </div>
);
const searchTextLayer = `Family Medicine Doctors\n\nFilters: Distance 25mi · Sort by Next Available\n\nDr. Sarah Chen — Family Medicine\nNext: Mon 9:00 AM · 3.2 mi\n\nDr. Michael Torres — Family Medicine, DO\nNext: Tue 10:30 AM · 5.1 mi\n\nDr. Priya Patel — Family Medicine\nNext: Wed 8:00 AM · 7.4 mi\n\nShowing 3 of 142 results`;
const searchHTMLLayer = `<main class="doctor-search">\n  <h1>Family Medicine Doctors</h1>\n  <div class="filters">\n    <select name="distance">25mi</select>\n    <select name="sortBy">NextAvailable</select>\n  </div>\n  <div class="results-list"\n    data-api="phynd"\n    data-specialty="family-medicine">\n    <div class="provider-card"\n      data-npi="12345679">\n      <!-- Phynd API hydrated -->\n    </div>\n  </div>\n</main>`;
const searchCSSLayer = `.doctor-search { max-width: 960px; margin: 0 auto; }\n.filters { display: flex; gap: 8px; margin-bottom: 16px; }\n.results-list { display: flex; flex-direction: column; }\n.provider-card {\n  display: flex; gap: 12px;\n  padding: 16px;\n  border-bottom: 1px solid #eee;\n  transition: background 0.15s;\n}\n.provider-card:hover { background: #f9f9f9; }`;
const searchAPILayer = `──── REQUEST 1: Phynd Provider Search ──────────────\nURL:    https://api.phynd.com/v2/providers/search\n        ?specialty=family-medicine&distance=25\n        &sortBy=NextAvailableAppointment\nMethod: GET    Status: 200 OK\nSize:   8,412 bytes    Time: 234ms\n\n{\n  "total": 142,\n  "results": [\n    { "npi": "12345679", "name": "Sarah Chen",\n      "next_available": "2026-06-16T09:00" },\n    { "npi": "12345680", "name": "Michael Torres",\n      "next_available": "2026-06-17T10:30" }\n  ]\n}`;
const searchDataLayer = `Table: provider_search_index\n+──────────+──────────────+──────────────────+──────────+─────────+\n| npi      | name         | specialty        | lat      | lng     |\n+──────────+──────────────+──────────────────+──────────+─────────+\n| 12345679 | Sarah Chen   | Family Medicine  | 32.7767  | -96.797 |\n| 12345680 | M. Torres    | Family Medicine  | 32.7512  | -97.330 |\n| 12345681 | Priya Patel  | Family Medicine  | 32.8998  | -96.858 |\n+──────────+──────────────+──────────────────+──────────+─────────+`;

// ── Location page layers ────────────────────────
const locationVisualLayer = () => (
  <div style={{fontFamily:"'Inter',sans-serif",color:"#1a1a2e"}}>
    <div style={{background:"#003C71",padding:"12px 20px"}}><span style={{color:"#fff",fontWeight:700,fontSize:14}}>Baylor Scott & White Health</span></div>
    <div style={{padding:"16px 24px"}}>
      <div style={{fontSize:16,fontWeight:700,color:"#003C71",marginBottom:10}}>Clinics Near You</div>
      <div style={{display:"flex",gap:12}}>
        <div style={{flex:1,display:"flex",flexDirection:"column",gap:8}}>
          {[{n:"BSW Clinic Gaston",a:"3600 Gaston Ave, Dallas",s:"Walk-ins accepted",h:"Mon-Fri 8-5"},{n:"BSW Urgent Care Greenville",a:"5201 Greenville Ave, Dallas",s:"Open now",h:"7 days 8-8"}].map((c,i)=>(
            <div key={i} style={{padding:10,borderRadius:8,border:"1px solid #e8e8e8"}}>
              <div style={{fontSize:13,fontWeight:600,color:"#003C71"}}>{c.n}</div>
              <div style={{fontSize:11,color:"#666"}}>{c.a}</div>
              <div style={{display:"flex",gap:6,marginTop:4}}>
                <span style={{fontSize:10,padding:"2px 6px",borderRadius:3,background:"#E8F5E9",color:"#2E7D32"}}>{c.s}</span>
                <span style={{fontSize:10,color:"#999"}}>{c.h}</span>
              </div>
            </div>
          ))}
        </div>
        <div style={{width:160,borderRadius:8,background:"#dbeafe",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:"#3b82f6",flexShrink:0}}>📍 Google Maps</div>
      </div>
    </div>
  </div>
);
const locationTextLayer = `Clinics Near You\n\nBSW Clinic Gaston\n3600 Gaston Ave, Dallas, TX 75246\nWalk-ins accepted · Mon-Fri 8:00 AM - 5:00 PM\nPhone: (214) 820-0111\n\nBSW Urgent Care Greenville\n5201 Greenville Ave, Dallas, TX 75206\nOpen now · 7 days 8:00 AM - 8:00 PM\nPhone: (214) 820-0222\n\nShowing 2 of 744 locations`;
const locationHTMLLayer = `<main class="location-finder">\n  <h1>Clinics Near You</h1>\n  <div class="search-bar">\n    <input type="text" placeholder="ZIP or city" />\n    <select name="radius">25mi</select>\n  </div>\n  <div class="results" data-api="location-geo">\n    <div class="clinic-card"\n      data-place-id="ChIJx5DG1a2ZToYR...">\n      <!-- Location API hydrated -->\n    </div>\n  </div>\n  <div class="map-container"\n    data-maps-api="google-places">\n    <!-- Google Maps embed -->\n  </div>\n</main>`;
const locationCSSLayer = `.location-finder { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }\n.clinic-card {\n  padding: 12px;\n  border: 1px solid #e8e8e8;\n  border-radius: 8px;\n  transition: box-shadow 0.15s;\n}\n.clinic-card:hover {\n  box-shadow: 0 2px 8px rgba(0,0,0,0.1);\n}\n.map-container {\n  height: 400px;\n  border-radius: 12px;\n  overflow: hidden;\n}`;
const locationAPILayer = `──── REQUEST 1: Location Geo API ──────────────────\nURL:    https://api.bswhealth.com/locations/search\n        ?lat=32.7767&lng=-96.7970&radius=25\nMethod: GET    Status: 200 OK\nSize:   12,847 bytes    Time: 189ms\n\n{\n  "total": 744,\n  "results": [\n    {\n      "id": "LOC-0301",\n      "name": "BSW Clinic Gaston",\n      "address": "3600 Gaston Ave, Dallas, TX",\n      "google_place_id": "ChIJx5DG1a2ZToYR...",\n      "walk_in": true,\n      "hours": "Mon-Fri 8:00-17:00",\n      "photo": "bswmedia.blob.core.windows.net/loc-0301.jpg"\n    }\n  ]\n}\n\n──── REQUEST 2: Google Maps Places ─────────────────\nURL:    https://maps.googleapis.com/maps/api/place/details\n        ?place_id=ChIJx5DG1a2ZToYR...\nMethod: GET    Status: 200 OK`;
const locationDataLayer = `Table: locations\n+──────────+──────────────────────+───────────────────────────+──────────+──────+\n| loc_id   | name                 | address                   | walk_in  | type |\n+──────────+──────────────────────+───────────────────────────+──────────+──────+\n| LOC-0301 | BSW Clinic Gaston    | 3600 Gaston Ave, Dallas   | true     | clinic|\n| LOC-0302 | BSW Urgent Care      | 5201 Greenville Ave       | true     | urgent|\n| LOC-0303 | BSW Medical Center   | 1201 Pennsylvania, FW     | false    | hosp |\n+──────────+──────────────────────+───────────────────────────+──────────+──────+`;


function XRayTab() {
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

// ── Sidebar / Nav / Tabs ──────────────────────────────────────────────────────
const NAV=[
  {id:"overview",icon:"⊞",label:"Overview"},{id:"sitemap",icon:"⊛",label:"Sitemap"},
  {id:"templates",icon:"⊟",label:"Templates"},{id:"xray",icon:"◈",label:"X-Ray"},
  {id:"apis",icon:"⊕",label:"APIs"},{id:"export",icon:"↓",label:"Export"},
];

function Sidebar({tab,setTab,projects}){
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
        {NAV.map(n=>{const active=tab===n.id;return(
          <button key={n.id} onClick={()=>setTab(n.id)} style={{width:"100%",display:"flex",alignItems:"center",gap:8,padding:"8px 10px",marginBottom:2,background:active?T.accentDim:"transparent",border:active?`1px solid ${T.border}`:"1px solid transparent",borderRadius:8,color:active?T.text0:T.text1,cursor:"pointer",fontSize:13,fontFamily:T.sans,fontWeight:active?500:400,textAlign:"left",transition:"all .12s"}}>
            <span style={{fontSize:14,width:18,textAlign:"center",color:active?T.accent:T.text2}}>{n.icon}</span>{n.label}
          </button>);
        })}
        <div style={{height:1,background:T.border,margin:"6px 0"}}/>
        <div style={{fontSize:10,color:T.text2,fontFamily:T.sans,letterSpacing:".8px",padding:"8px 8px 4px",fontWeight:600}}>PROJECTS</div>
        {projects.map(p=>(
          <div key={p.id} style={{padding:"7px 10px",borderRadius:8,marginBottom:2,background:p.name==="bswhealth.com"?T.accentDim:"transparent",border:p.name==="bswhealth.com"?`1px solid ${T.border}`:"1px solid transparent",cursor:"pointer"}}>
            <div style={{fontSize:12,color:p.name==="bswhealth.com"?T.text0:T.text1,fontFamily:T.mono,fontWeight:500,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{p.name}</div>
            <div style={{fontSize:10,color:T.text2,fontFamily:T.body,marginTop:2,display:"flex",justifyContent:"space-between"}}><span>{p.status==="done"?"✓ Done":"… Queued"}</span>{p.score&&<span style={{color:p.score>85?T.green:T.amber}}>{p.score}</span>}</div>
          </div>
        ))}
      </div>
      <div style={{padding:"12px 16px",borderTop:`1px solid ${T.border}`}}>
        <div style={{fontSize:11,color:T.text2,fontFamily:T.body,lineHeight:1.5}}>
          <div style={{color:T.text1,fontWeight:500,marginBottom:2}}>Starter plan</div><div>3 / 10 analyses used</div>
          <div style={{height:3,background:"rgba(255,255,255,0.06)",borderRadius:2,marginTop:6}}><div style={{height:"100%",width:"30%",background:T.accent,borderRadius:2}}/></div>
        </div>
        <button style={{marginTop:10,width:"100%",padding:"7px",background:`rgba(${hex2rgb(T.accent)},0.15)`,border:`1px solid rgba(${hex2rgb(T.accent)},0.3)`,borderRadius:7,color:T.accent,fontSize:12,fontFamily:T.sans,fontWeight:500,cursor:"pointer"}}>Upgrade ↗</button>
      </div>
    </div>
  );
}

// ── Other tabs (Overview, Templates, APIs, Export) ────────────────────────────
function OverviewTab({data}){
  const metrics=[{l:"Total pages",v:data.metrics.pages.toLocaleString(),c:T.accent},{l:"Sitemap sections",v:data.metrics.sections,c:T.violet},{l:"Page templates",v:data.metrics.templates,c:T.cyan},{l:"APIs detected",v:data.metrics.apis,c:T.green},{l:"Crawl time",v:data.metrics.crawlTime,c:T.amber}];
  return(
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:12,padding:"16px 20px",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:-20,right:-20,width:120,height:120,borderRadius:"50%",background:`radial-gradient(circle,rgba(${hex2rgb(T.accent)},0.15),transparent 70%)`,pointerEvents:"none"}}/>
        <div style={{fontSize:18,fontWeight:700,color:T.text0,fontFamily:T.sans,letterSpacing:"-.4px",marginBottom:2}}>{data.title}</div>
        <div style={{fontSize:12,color:T.text2,fontFamily:T.mono,marginBottom:10}}>{data.domain} · {data.industry}</div>
        <div style={{fontSize:13,color:T.text1,fontFamily:T.body,lineHeight:1.7,maxWidth:520}}>{data.summary}</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:5,marginTop:12}}>{data.tags.map(t=><Chip key={t} label={t}/>)}</div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8}}>{metrics.map(m=>(
        <div key={m.l} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:10,padding:"12px 14px",position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",bottom:-8,right:-8,width:40,height:40,borderRadius:"50%",background:`rgba(${hex2rgb(m.c)},0.1)`}}/>
          <div style={{fontSize:11,color:T.text2,fontFamily:T.body,marginBottom:6}}>{m.l}</div>
          <div style={{fontSize:22,fontWeight:700,color:m.c,fontFamily:T.sans,letterSpacing:"-.5px"}}>{m.v}</div>
        </div>
      ))}</div>
      <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:12,padding:"14px 18px"}}>
        <div style={{fontSize:12,fontWeight:600,color:T.text2,fontFamily:T.sans,letterSpacing:".6px",marginBottom:10}}>TECH STACK</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:6}}>{data.tech.map(t=><Chip key={t} label={t}/>)}</div>
      </div>
    </div>
  );
}

function SitemapTab({data}){return(<div style={{display:"flex",flexDirection:"column",gap:14}}><MindMap nodes={data.nodes}/><div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:12,padding:"14px 18px"}}><div style={{fontSize:12,fontWeight:600,color:T.text2,fontFamily:T.sans,letterSpacing:".6px",marginBottom:10}}>SITEMAP FILES</div><div style={{display:"flex",flexDirection:"column",gap:6}}>{[["/physician-sitemap.xml","4,200","Phynd"],["/allied-health-professional-sitemap.xml","1,800","Phynd"],["/nurse-practitioner-sitemap.xml","900","Phynd"],["/physician-assistant-sitemap.xml","600","Phynd"],["/location-sitemap.xml","744","Geo API"],["/blog-sitemap.xml","2,200","CMS"],["/specialty-sitemap.xml","180","CMS"]].map(([p,c,a])=>(<div key={p} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"6px 10px",background:T.bg2,borderRadius:7}}><span style={{fontSize:12,color:T.text1,fontFamily:T.mono}}>{p}</span><div style={{display:"flex",gap:8,alignItems:"center"}}><span style={{fontSize:11,color:T.text2}}>{c} URLs</span><Badge label={a} color={a==="Phynd"?T.accent:a==="Geo API"?T.cyan:T.text2} dim/></div></div>))}</div></div></div>);}

// ── Stacked browser preview for Templates tab ────────────────────────────────
function StackedPreview({template}) {
  const [hovLayer, setHovLayer] = useState(null);
  if (!template) return (
    <div style={{height:200,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:10,background:T.bg1,borderRadius:12,border:`1px dashed ${T.border}`}}>
      <span style={{fontSize:28,opacity:0.3}}>◈</span>
      <span style={{fontSize:13,color:T.text2,fontFamily:T.body}}>Select a template to see its page anatomy</span>
    </div>
  );
  const apiColors = {"Phynd Provider API":"#6366F1","Epic Open Scheduling":"#10B981","Location Geo API":"#22D3EE","Google Maps Places":"#22D3EE"};
  return (
    <div>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
        <Badge label="Stacked View" color={template.color}/>
        <span style={{fontSize:13,color:T.text1,fontFamily:T.body}}>Page anatomy · <strong style={{color:T.text0}}>{template.name}</strong></span>
      </div>
      <div style={{border:`1px solid rgba(255,255,255,0.1)`,borderRadius:12,overflow:"hidden",boxShadow:`0 0 40px rgba(${hex2rgb(template.color)},0.1)`}}>
        {/* browser title bar */}
        <div style={{background:"#1A1B2C",padding:"8px 14px",display:"flex",alignItems:"center",gap:8,borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
          <div style={{display:"flex",gap:6}}>{["#FF5F57","#FEBC2E","#28C840"].map(c=><div key={c} style={{width:11,height:11,borderRadius:"50%",background:c}}/>)}</div>
          <div style={{flex:1,background:"rgba(255,255,255,0.05)",borderRadius:6,padding:"4px 12px",fontSize:11,color:T.text2,fontFamily:T.mono,marginLeft:6}}>
            bswhealth.com{template.pattern.split("·")[0].trim().replace("/*","/{slug}")}
          </div>
          <div style={{display:"flex",gap:4,opacity:0.5}}>
            {["↺","⊞","↗"].map(s=><span key={s} style={{fontSize:12,color:T.text2,padding:"0 4px"}}>{s}</span>)}
          </div>
        </div>
        {/* page layers */}
        <div style={{position:"relative",background:T.bg0}}>
          {/* scan-line overlay */}
          <div style={{position:"absolute",inset:0,backgroundImage:"repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(255,255,255,0.015) 3px,rgba(255,255,255,0.015) 4px)",pointerEvents:"none",zIndex:3}}/>
          {template.layers.map((layer,i) => {
            const apiCol = layer.api ? (apiColors[layer.api] || layer.color) : layer.color;
            const isHov = hovLayer === i;
            return (
              <div key={i} onMouseEnter={()=>setHovLayer(i)} onMouseLeave={()=>setHovLayer(null)}
                style={{position:"relative",height:layer.h,background:isHov?`rgba(${hex2rgb(apiCol)},0.22)`:`rgba(${hex2rgb(apiCol)},${layer.api?0.12:0.06})`,borderBottom:"1px solid rgba(255,255,255,0.04)",display:"flex",alignItems:"center",padding:"0 14px",transition:"background .15s",cursor:"default",zIndex:2}}>
                {/* left accent bar */}
                <div style={{position:"absolute",left:0,top:4,bottom:4,width:3,background:apiCol,borderRadius:"0 2px 2px 0",opacity:isHov?1:0.5}}/>
                <div style={{display:"flex",alignItems:"center",gap:10,flex:1}}>
                  <span style={{fontSize:12,color:isHov?T.text0:apiCol,fontFamily:T.sans,fontWeight:500,opacity:isHov?1:0.8}}>{layer.label}</span>
                  {layer.api && <Badge label={layer.api} color={apiCol} dim={!isHov}/>}
                </div>
                {/* shimmer content lines */}
                <div style={{display:"flex",flexDirection:"column",gap:5,opacity:isHov?0.5:0.2}}>
                  {Array.from({length:Math.max(1,Math.floor(layer.h/26))}).map((_,j)=>(
                    <div key={j} style={{height:6,width:40+j*18,background:apiCol,borderRadius:3}}/>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {/* legend */}
      <div style={{display:"flex",flexWrap:"wrap",gap:10,marginTop:12}}>
        {[...new Set(template.layers.map(l=>l.api).filter(Boolean))].map(api => {
          const col = apiColors[api] || "#6366F1";
          return (
            <div key={api} style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:T.text1,fontFamily:T.body}}>
              <div style={{width:8,height:8,borderRadius:2,background:col}}/>{api}
            </div>
          );
        })}
        <div style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:T.text2,fontFamily:T.body}}>
          <div style={{width:8,height:8,borderRadius:2,background:"#334155"}}/> Static / CMS
        </div>
      </div>
    </div>
  );
}

function TemplatesTab({data}){
  const [sel, setSel] = useState(data.templates[0]);
  return(
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      <div style={{background:`rgba(${hex2rgb(T.accent)},0.06)`,border:`1px solid rgba(${hex2rgb(T.accent)},0.2)`,borderRadius:10,padding:"10px 14px",fontSize:13,color:T.text1,fontFamily:T.body,lineHeight:1.6}}>
        Found <strong style={{color:T.text0}}>{data.templates.length} page templates</strong>. Click a template to see its stacked page anatomy with API attribution. Switch to the <strong style={{color:T.accent}}>X-Ray tab</strong> for the full 6-layer deep view.
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:8}}>
        {data.templates.map(t=>{const p=pct(t.count,t.total);const active=sel?.id===t.id;return(
          <div key={t.id} onClick={()=>setSel(active?null:t)}
            style={{background:active?`rgba(${hex2rgb(t.color)},0.1)`:T.card,border:active?`1.5px solid rgba(${hex2rgb(t.color)},0.5)`:`1px solid ${T.border}`,borderRadius:10,padding:"12px 14px",cursor:"pointer",transition:"all .15s"}}>
            <div style={{width:8,height:8,borderRadius:2,background:t.color,marginBottom:8}}/>
            <div style={{fontSize:12,fontWeight:600,color:active?T.text0:T.text1,fontFamily:T.sans,marginBottom:3,lineHeight:1.3}}>{t.name}</div>
            <div style={{fontSize:11,color:T.text2,fontFamily:T.body,marginBottom:6}}>{t.count.toLocaleString()} pages · {p}%</div>
            <div style={{height:2,background:"rgba(255,255,255,0.06)",borderRadius:1}}><div style={{height:"100%",width:`${Math.min(100,p)}%`,background:t.color,borderRadius:1}}/></div>
            <div style={{display:"flex",flexWrap:"wrap",gap:4,marginTop:8}}>{t.features.slice(0,3).map(f=><span key={f} style={{fontSize:10,padding:"2px 6px",borderRadius:4,background:"rgba(255,255,255,0.04)",border:`1px solid ${T.border}`,color:T.text2,fontFamily:T.body}}>{f}</span>)}</div>
          </div>);
        })}
      </div>
      <StackedPreview template={sel}/>
    </div>
  );
}

function APIsTab({data}){
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

function ExportTab(){
  const exports=[{icon:"⬇",label:"PDF Discovery Report",desc:"Full analysis + X-ray views for client delivery",badge:"PDF",color:T.accent},{icon:"⬇",label:"CSV — URL inventory",desc:"All pages, templates, and sitemap sections",badge:"CSV",color:T.cyan},{icon:"⬇",label:"JSON — raw analysis",desc:"Machine-readable output for downstream tools",badge:"JSON",color:T.violet},{icon:"⬇",label:"Figma sitemap kit",desc:"Mind map as Figma-compatible JSON",badge:"Figma",color:T.green}];
  return(
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      {exports.map(e=>(
        <div key={e.label} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:12,padding:"14px 18px",display:"flex",alignItems:"center",gap:14,cursor:"pointer"}} onMouseEnter={ev=>ev.currentTarget.style.borderColor=`rgba(${hex2rgb(e.color)},0.4)`} onMouseLeave={ev=>ev.currentTarget.style.borderColor=T.border}>
          <div style={{width:36,height:36,borderRadius:9,background:`rgba(${hex2rgb(e.color)},0.12)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{e.icon}</div>
          <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:T.text0,fontFamily:T.sans,marginBottom:2}}>{e.label}</div><div style={{fontSize:12,color:T.text2,fontFamily:T.body}}>{e.desc}</div></div>
          <Badge label={e.badge} color={e.color}/>
        </div>
      ))}
      <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:12,padding:"14px 18px",marginTop:4}}>
        <div style={{fontSize:12,fontWeight:600,color:T.text2,fontFamily:T.sans,letterSpacing:".6px",marginBottom:10}}>SHARE & COLLABORATE</div>
        <div style={{display:"flex",gap:8}}>
          <input readOnly value="https://websight.app/share/bswhealth-2026-06-15" style={{flex:1,background:T.bg2,border:`1px solid ${T.border}`,borderRadius:7,padding:"8px 12px",fontSize:12,color:T.text1,fontFamily:T.mono,outline:"none"}}/>
          <button style={{padding:"8px 16px",background:T.accentDim,border:`1px solid rgba(${hex2rgb(T.accent)},0.3)`,borderRadius:7,color:T.accent,fontSize:12,fontFamily:T.sans,fontWeight:500,cursor:"pointer"}}>Copy link</button>
        </div>
      </div>
    </div>
  );
}

// ── Root ───────────────────────────────────────────────────────────────────────
const STEP_LABELS=["Fetching sitemap files…","Discovering URL patterns…","Identifying templates…","Detecting APIs…","Analyzing tech stack…","Building report…"];

export default function App(){
  const[tab,setTab]=useState("overview");
  const[data]=useState(BSW);
  const[url,setUrl]=useState("https://www.bswhealth.com");
  const[loading,setLoading]=useState(false);
  const[step,setStep]=useState(0);

  useEffect(()=>{
    if(!loading)return;
    const id=setInterval(()=>{
      setStep(s=>{
        if(s>=STEP_LABELS.length-1){
          clearInterval(id);
          setTimeout(()=>setLoading(false),400);
          return s;
        }
        return s+1;
      });
    },500);
    return()=>clearInterval(id);
  },[loading]);

  const tabContent=()=>{
    if(loading)return(
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:400,gap:20}}>
        <div style={{width:36,height:36,border:`2px solid ${T.border}`,borderTopColor:T.accent,borderRadius:"50%",animation:"spin .8s linear infinite"}}/>
        <div style={{fontSize:15,fontWeight:600,color:T.text0,fontFamily:T.sans}}>Analyzing website</div>
        <div style={{display:"flex",flexDirection:"column",gap:8,width:280}}>{STEP_LABELS.map((s,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:10,fontSize:12,color:i<step?T.green:i===step?T.text0:T.text2,fontFamily:T.body}}>
            <div style={{width:7,height:7,borderRadius:"50%",flexShrink:0,background:i<step?T.green:i===step?T.accent:"rgba(255,255,255,0.1)",boxShadow:i===step?`0 0 8px ${T.accent}`:""}}/>{s}
          </div>))}</div>
      </div>);
    switch(tab){
      case"overview": return<OverviewTab data={data}/>;
      case"sitemap": return<SitemapTab data={data}/>;
      case"templates": return<TemplatesTab data={data}/>;
      case"xray": return<XRayTab/>;
      case"apis": return<APIsTab data={data}/>;
      case"export": return<ExportTab/>;
      default: return<OverviewTab data={data}/>;
    }
  };

  return(
    <><Fonts/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}*{box-sizing:border-box;margin:0;padding:0}::-webkit-scrollbar{width:6px;height:6px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(99,102,241,0.3);border-radius:3px}`}</style>
      <div style={{display:"flex",flexDirection:"column",minHeight:620,background:T.bg0,color:T.text0,fontFamily:T.body}}>
        <div style={{display:"flex",flex:1}}>
          <Sidebar tab={tab} setTab={setTab} projects={data.projects}/>
          <div style={{flex:1,display:"flex",flexDirection:"column",minWidth:0}}>
            <div style={{background:T.bg1,borderBottom:`1px solid ${T.border}`,padding:"10px 20px",display:"flex",gap:10,alignItems:"center"}}>
              <span style={{fontSize:14,color:T.text2}}>🌐</span>
              <input value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://example.com" style={{flex:1,background:T.bg2,border:`1px solid ${T.border}`,borderRadius:8,padding:"8px 14px",fontSize:13,color:T.text0,fontFamily:T.mono,outline:"none"}}/>
              <button onClick={()=>{setStep(0);setLoading(true);}} disabled={loading} style={{padding:"8px 22px",background:`linear-gradient(135deg,${T.accent},${T.violet})`,border:"none",borderRadius:8,color:"#fff",fontSize:13,fontFamily:T.sans,fontWeight:600,cursor:loading?"default":"pointer",whiteSpace:"nowrap",letterSpacing:".2px",opacity:loading?0.6:1}}>Analyze ↗</button>
            </div>
            <div style={{flex:1,overflowY:"auto",padding:"18px 20px"}}>{tabContent()}</div>
          </div>
        </div>
      </div>
    </>
  );
}
