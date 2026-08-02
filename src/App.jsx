import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation, useParams } from "react-router-dom";
import { useAuth, useClerk } from "@clerk/clerk-react";
import { T } from "./lib/theme";
import { RESTRICTED_TABS } from "./lib/access";
import { TAB_SLUGS, SLUG_TABS, DEFAULT_TAB } from "./lib/routes";
import { getOrCreateGuestToken, clearGuestToken, fetchMe, ApiError } from "./lib/auth";
import { createCrawl, getCrawl, listCrawls } from "./lib/crawls";
import { mapMetrics, buildSitemapNodes, mapTemplates, mapIntegrations, mapProjects } from "./lib/crawlMapper";
import { Fonts } from "./components/Fonts";
import { HomePage } from "./components/HomePage";
import { Sidebar } from "./components/Sidebar";
import { XRayTab } from "./components/XRayTab";
import { UpsellNotice } from "./components/ui/UpsellNotice";
import { OverviewTab } from "./components/tabs/OverviewTab";
import { SitemapTab } from "./components/tabs/SitemapTab";
import { TemplatesTab } from "./components/tabs/TemplatesTab";
import { APIsTab } from "./components/tabs/APIsTab";
import { ExportTab } from "./components/tabs/ExportTab";

const INITIAL_ACCESS = { tier: null, planName: "", scanLimit: 0, remainingScans: 0, loading: false, error: null };
const POLL_INTERVAL_MS = 2000;
const MAX_POLL_FAILURES = 3;
const GLOBAL_STYLE = `@keyframes spin{to{transform:rotate(360deg)}}*{box-sizing:border-box;margin:0;padding:0}::-webkit-scrollbar{width:6px;height:6px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(99,102,241,0.3);border-radius:3px}`;

function DashboardRoute({isSignedIn,access,tabContent,setTab,projects,crawlId,onLogout,url,setUrl,isBusy,handleAnalyzeClick}){
  const{slug}=useParams();
  const resolvedTab=SLUG_TABS[slug];
  if(!resolvedTab) return<Navigate to="/" replace/>;
  if(!isSignedIn&&!access.tier) return<Navigate to="/" replace/>;
  return(
    <><Fonts/>
      <style>{GLOBAL_STYLE}</style>
      <div style={{display:"flex",flexDirection:"column",minHeight:620,background:T.bg0,color:T.text0,fontFamily:T.body}}>
        {access.error&&(
          <div style={{background:T.bg2,borderBottom:`1px solid ${T.border}`,padding:"8px 20px",fontSize:12,color:T.amber,fontFamily:T.body}}>{access.error}</div>
        )}
        <div style={{display:"flex",flex:1}}>
          <Sidebar tab={resolvedTab} setTab={setTab} projects={projects} access={access} currentCrawlId={crawlId} onLogout={onLogout}/>
          <div style={{flex:1,display:"flex",flexDirection:"column",minWidth:0}}>
            <div style={{background:T.bg1,borderBottom:`1px solid ${T.border}`,padding:"10px 20px",display:"flex",gap:10,alignItems:"center"}}>
              <span style={{fontSize:14,color:T.text2}}>🌐</span>
              <input value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://example.com" style={{flex:1,background:T.bg2,border:`1px solid ${T.border}`,borderRadius:8,padding:"8px 14px",fontSize:13,color:T.text0,fontFamily:T.mono,outline:"none"}}/>
              <button onClick={handleAnalyzeClick} disabled={isBusy} style={{padding:"8px 22px",background:`linear-gradient(135deg,${T.accent},${T.violet})`,border:"none",borderRadius:8,color:"#fff",fontSize:13,fontFamily:T.sans,fontWeight:600,cursor:isBusy?"default":"pointer",whiteSpace:"nowrap",letterSpacing:".2px",opacity:isBusy?0.6:1}}>Analyze ↗</button>
            </div>
            <div style={{flex:1,overflowY:"auto",padding:"18px 20px"}}>{tabContent(resolvedTab)}</div>
          </div>
        </div>
      </div>
    </>
  );
}

function AppShell(){
  const[access,setAccess]=useState(INITIAL_ACCESS);
  const[analyzeError,setAnalyzeError]=useState(null);
  const[url,setUrl]=useState("");
  const[projects,setProjects]=useState([]);
  const[crawlId,setCrawlId]=useState(null);
  const[crawlStatus,setCrawlStatus]=useState(null);
  const[crawl,setCrawl]=useState(null);
  const[crawlError,setCrawlError]=useState(null);
  const{isSignedIn,getToken}=useAuth();
  const{signOut}=useClerk();
  const navigate=useNavigate();
  const location=useLocation();
  const isDashboard=location.pathname!=="/";

  async function resolveIdentity(){
    if(isSignedIn) return { clerkToken: await getToken() };
    return { guestToken: getOrCreateGuestToken() };
  }

  useEffect(()=>{
    if(!isSignedIn)return;
    if(location.pathname==="/") navigate(`/${TAB_SLUGS[DEFAULT_TAB]}`,{replace:true});
    let cancelled=false;
    (async()=>{
      setAccess(a=>({...a,loading:true,error:null}));
      try{
        const token=await getToken();
        const me=await fetchMe(token);
        if(cancelled)return;
        setAccess({tier:me.plan.tier,planName:me.plan.name,scanLimit:me.plan.scanLimit,remainingScans:me.remainingScans,loading:false,error:null});
      }catch{
        if(cancelled)return;
        setAccess(a=>({...a,loading:false,error:"Couldn't determine your access level — try refreshing"}));
      }
    })();
    return()=>{cancelled=true;};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[isSignedIn,getToken]);

  async function refreshProjects(){
    try{
      const identity=await resolveIdentity();
      const result=await listCrawls(identity);
      setProjects(mapProjects(result));
      return result;
    }catch{
      setProjects([]);
      return {crawls:[]};
    }
  }

  useEffect(()=>{
    if(!isDashboard)return;
    let cancelled=false;
    (async()=>{
      const result=await refreshProjects();
      if(cancelled)return;
      const[mostRecent]=result.crawls??[];
      if(mostRecent)setCrawlId(mostRecent.id);
    })();
    return()=>{cancelled=true;};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[isDashboard]);

  useEffect(()=>{
    if(!crawlId)return;
    let cancelled=false;
    let failures=0;
    let timeoutId;

    async function poll(){
      if(cancelled)return;
      try{
        const identity=await resolveIdentity();
        const result=await getCrawl(crawlId,identity);
        if(cancelled)return;
        failures=0;
        setCrawlStatus(result.status);
        if(result.status==="done"){
          setCrawl(result);
          refreshProjects();
          return;
        }
        if(result.status==="failed"){
          setCrawlError(result.error||"The crawl failed.");
          refreshProjects();
          return;
        }
        timeoutId=setTimeout(poll,POLL_INTERVAL_MS);
      }catch{
        failures+=1;
        if(cancelled)return;
        if(failures>=MAX_POLL_FAILURES){
          setCrawlError("Lost connection while checking crawl status.");
          setCrawlStatus("failed");
          return;
        }
        timeoutId=setTimeout(poll,POLL_INTERVAL_MS);
      }
    }
    poll();
    return()=>{cancelled=true;clearTimeout(timeoutId);};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[crawlId,isSignedIn,getToken]);

  function handleGuestAccess(nextAccess){
    setAccess(nextAccess);
    navigate(`/${TAB_SLUGS[DEFAULT_TAB]}`);
  }

  async function handleLogout(){
    if(isSignedIn){
      await signOut?.();
    }else{
      clearGuestToken();
    }
    navigate("/");
    setAccess(INITIAL_ACCESS);
    setAnalyzeError(null);
    setUrl("");
    setProjects([]);
    setCrawlId(null);
    setCrawlStatus(null);
    setCrawl(null);
    setCrawlError(null);
  }

  function handleSetTab(nextTabId){
    setAnalyzeError(null);
    navigate(`/${TAB_SLUGS[nextTabId]}`);
  }

  async function handleAnalyzeClick(){
    setAnalyzeError(null);
    setCrawlError(null);
    try{
      const identity=await resolveIdentity();
      const result=await createCrawl({domain:url,...identity});
      setAccess(a=>({...a,remainingScans:result.remainingScans}));
      setCrawl(null);
      setCrawlStatus("queued");
      setCrawlId(result.crawlId);
    }catch(err){
      if(err instanceof ApiError&&err.status===402){
        setAccess(a=>({...a,remainingScans:0}));
        setAnalyzeError({kind:"quota",body:err.body});
      }else{
        setAnalyzeError({kind:"generic"});
      }
    }
  }

  const isPaid=access.tier==="paid";
  const isBusy=crawlStatus==="queued"||crawlStatus==="running";

  const tabContent=(tab)=>{
    if(isBusy)return(
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:400,gap:20}}>
        <div style={{width:36,height:36,border:`2px solid ${T.border}`,borderTopColor:T.accent,borderRadius:"50%",animation:"spin .8s linear infinite"}}/>
        <div style={{fontSize:15,fontWeight:600,color:T.text0,fontFamily:T.sans}}>Analyzing website</div>
        <div style={{fontSize:13,color:T.text1,fontFamily:T.body}}>{crawlStatus==="queued"?"Waiting in queue…":`Crawling ${url}…`}</div>
      </div>);
    if(crawlStatus==="failed"){
      return(
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:300,gap:12}}>
          <div style={{fontSize:13,color:T.text1,fontFamily:T.body}}>{crawlError||"Something went wrong crawling this site."}</div>
          <button onClick={handleAnalyzeClick} style={{padding:"7px 18px",background:T.bg2,border:`1px solid ${T.border}`,borderRadius:8,color:T.text0,fontSize:13,fontFamily:T.sans,cursor:"pointer"}}>Retry</button>
        </div>
      );
    }
    if(analyzeError?.kind==="quota"){
      const hint=access.tier==="guest"?" Log in for more scans.":"";
      return<UpsellNotice title="Scan limit reached" message={`You've used all ${analyzeError.body.scanLimit} scans on the ${analyzeError.body.plan} plan.${hint}`}/>;
    }
    if(analyzeError?.kind==="generic"){
      return(
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:300,gap:12}}>
          <div style={{fontSize:13,color:T.text1,fontFamily:T.body}}>Something went wrong starting that scan.</div>
          <button onClick={handleAnalyzeClick} style={{padding:"7px 18px",background:T.bg2,border:`1px solid ${T.border}`,borderRadius:8,color:T.text0,fontSize:13,fontFamily:T.sans,cursor:"pointer"}}>Retry</button>
        </div>
      );
    }
    if(RESTRICTED_TABS.includes(tab)&&!isPaid){
      return<UpsellNotice title="Upgrade to unlock this tab" message="This tab is available on paid plans."/>;
    }
    if(crawlStatus!=="done"||!crawl){
      return(
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:300,gap:10}}>
          <div style={{fontSize:14,fontWeight:600,color:T.text0,fontFamily:T.sans}}>No analysis yet</div>
          <div style={{fontSize:13,color:T.text2,fontFamily:T.body}}>Enter a domain above and click Analyze to get started.</div>
        </div>
      );
    }
    const metrics=mapMetrics(crawl);
    const nodes=buildSitemapNodes(crawl.pages,crawl.domain);
    const templates=mapTemplates(crawl.clusters,crawl.pages.length);
    const apis=mapIntegrations(crawl.integrations);
    const data={domain:crawl.domain,metrics,nodes,templates,apis,pages:crawl.pages};
    switch(tab){
      case"overview": return<OverviewTab data={data}/>;
      case"sitemap": return<SitemapTab data={data}/>;
      case"templates": return<TemplatesTab data={data} pages={data.pages}/>;
      case"xray": return<XRayTab pages={data.pages}/>;
      case"apis": return<APIsTab data={data}/>;
      case"export": return<ExportTab data={data}/>;
      default: return<OverviewTab data={data}/>;
    }
  };

  return(
    <Routes>
      <Route path="/" element={<><Fonts/><HomePage onGuestAccess={handleGuestAccess}/></>}/>
      <Route path="/:slug" element={
        <DashboardRoute
          isSignedIn={isSignedIn}
          access={access}
          tabContent={tabContent}
          setTab={handleSetTab}
          projects={projects}
          crawlId={crawlId}
          onLogout={handleLogout}
          url={url}
          setUrl={setUrl}
          isBusy={isBusy}
          handleAnalyzeClick={handleAnalyzeClick}
        />
      }/>
      <Route path="*" element={<Navigate to="/" replace/>}/>
    </Routes>
  );
}

export default function App(){
  return(
    <BrowserRouter>
      <AppShell/>
    </BrowserRouter>
  );
}
