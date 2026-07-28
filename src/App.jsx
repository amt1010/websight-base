import { useState, useEffect } from "react";
import { useAuth } from "@clerk/clerk-react";
import { T } from "./lib/theme";
import { BSW } from "./lib/mockData";
import { RESTRICTED_TABS } from "./lib/access";
import { getOrCreateGuestToken, fetchMe, consumeScan, ApiError } from "./lib/auth";
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

const STEP_LABELS=["Fetching sitemap files…","Discovering URL patterns…","Identifying templates…","Detecting APIs…","Analyzing tech stack…","Building report…"];

const INITIAL_ACCESS = { tier: null, planName: "", scanLimit: 0, remainingScans: 0, loading: false, error: null };

export default function App(){
  const[view,setView]=useState("home");
  const[access,setAccess]=useState(INITIAL_ACCESS);
  const[analyzeError,setAnalyzeError]=useState(null);
  const[tab,setTab]=useState("overview");
  const[data]=useState(BSW);
  const[url,setUrl]=useState("https://www.bswhealth.com");
  const[loading,setLoading]=useState(false);
  const[step,setStep]=useState(0);
  const{isSignedIn,getToken}=useAuth();

  useEffect(()=>{
    if(!isSignedIn)return;
    let cancelled=false;
    (async()=>{
      setView("dashboard");
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
  },[isSignedIn,getToken]);

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

  function handleGuestAccess(nextAccess){
    setAccess(nextAccess);
    setView("dashboard");
  }

  function handleSetTab(nextTab){
    setAnalyzeError(null);
    setTab(nextTab);
  }

  async function handleAnalyzeClick(){
    setAnalyzeError(null);
    try{
      const clerkToken=isSignedIn?await getToken():undefined;
      const guestToken=isSignedIn?undefined:getOrCreateGuestToken();
      const result=await consumeScan({guestToken,clerkToken});
      setAccess(a=>({...a,remainingScans:result.remainingScans}));
      setStep(0);
      setLoading(true);
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

  if(view==="home"){
    return(<><Fonts/><HomePage onGuestAccess={handleGuestAccess}/></>);
  }

  return(
    <><Fonts/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}*{box-sizing:border-box;margin:0;padding:0}::-webkit-scrollbar{width:6px;height:6px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(99,102,241,0.3);border-radius:3px}`}</style>
      <div style={{display:"flex",flexDirection:"column",minHeight:620,background:T.bg0,color:T.text0,fontFamily:T.body}}>
        {access.error&&(
          <div style={{background:T.bg2,borderBottom:`1px solid ${T.border}`,padding:"8px 20px",fontSize:12,color:T.amber,fontFamily:T.body}}>{access.error}</div>
        )}
        <div style={{display:"flex",flex:1}}>
          <Sidebar tab={tab} setTab={handleSetTab} projects={data.projects} access={access}/>
          <div style={{flex:1,display:"flex",flexDirection:"column",minWidth:0}}>
            <div style={{background:T.bg1,borderBottom:`1px solid ${T.border}`,padding:"10px 20px",display:"flex",gap:10,alignItems:"center"}}>
              <span style={{fontSize:14,color:T.text2}}>🌐</span>
              <input value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://example.com" style={{flex:1,background:T.bg2,border:`1px solid ${T.border}`,borderRadius:8,padding:"8px 14px",fontSize:13,color:T.text0,fontFamily:T.mono,outline:"none"}}/>
              <button onClick={handleAnalyzeClick} disabled={loading} style={{padding:"8px 22px",background:`linear-gradient(135deg,${T.accent},${T.violet})`,border:"none",borderRadius:8,color:"#fff",fontSize:13,fontFamily:T.sans,fontWeight:600,cursor:loading?"default":"pointer",whiteSpace:"nowrap",letterSpacing:".2px",opacity:loading?0.6:1}}>Analyze ↗</button>
            </div>
            <div style={{flex:1,overflowY:"auto",padding:"18px 20px"}}>{tabContent()}</div>
          </div>
        </div>
      </div>
    </>
  );
}
