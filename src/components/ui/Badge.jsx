import { T, hex2rgb } from "../../lib/theme";

export function Badge({label,color="#6366F1",dim=false}){
  return (
    <span style={{fontSize:11,padding:"2px 8px",borderRadius:20,fontFamily:T.sans,fontWeight:500,background:`rgba(${hex2rgb(color)},${dim?0.12:0.2})`,color,border:`1px solid rgba(${hex2rgb(color)},0.3)`}}>{label}</span>
  );
}
