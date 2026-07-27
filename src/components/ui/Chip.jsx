import { T } from "../../lib/theme";

export function Chip({label}){
  return (
    <span style={{fontSize:11,padding:"3px 9px",borderRadius:5,fontFamily:T.mono,background:"rgba(255,255,255,0.04)",border:`1px solid ${T.border}`,color:T.text1}}>{label}</span>
  );
}
