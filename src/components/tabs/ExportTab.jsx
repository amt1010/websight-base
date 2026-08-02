import { T, hex2rgb } from "../../lib/theme";
import { Badge } from "../ui/Badge";
import { buildCsv, downloadFile, openPrintableReport } from "../../lib/exportData";

export function ExportTab({data}){
  const exports=[
    {icon:"⬇",label:"PDF Discovery Report",desc:"Metrics, page templates, and detected APIs, formatted for print/PDF",badge:"PDF",color:T.accent,onClick:()=>openPrintableReport(data)},
    {icon:"⬇",label:"CSV — URL inventory",desc:"Every crawled page's URL, path, depth, and status",badge:"CSV",color:T.cyan,onClick:()=>downloadFile(`${data.domain}-urls.csv`,buildCsv(data.pages),"text/csv")},
    {icon:"⬇",label:"JSON — raw analysis",desc:"Machine-readable output for downstream tools",badge:"JSON",color:T.violet,onClick:()=>downloadFile(`${data.domain}-analysis.json`,JSON.stringify(data,null,2),"application/json")},
  ];
  return(
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      {exports.map(e=>(
        <div key={e.label} onClick={e.onClick} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:12,padding:"14px 18px",display:"flex",alignItems:"center",gap:14,cursor:"pointer"}} onMouseEnter={ev=>ev.currentTarget.style.borderColor=`rgba(${hex2rgb(e.color)},0.4)`} onMouseLeave={ev=>ev.currentTarget.style.borderColor=T.border}>
          <div style={{width:36,height:36,borderRadius:9,background:`rgba(${hex2rgb(e.color)},0.12)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{e.icon}</div>
          <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:T.text0,fontFamily:T.sans,marginBottom:2}}>{e.label}</div><div style={{fontSize:12,color:T.text2,fontFamily:T.body}}>{e.desc}</div></div>
          <Badge label={e.badge} color={e.color}/>
        </div>
      ))}
    </div>
  );
}
