export const T = {
  bg0:"#07080F", bg1:"#0D0E1A", bg2:"#12131F", bg3:"#181928", card:"#1A1B2E",
  border:"rgba(99,102,241,0.15)", borderHover:"rgba(99,102,241,0.4)",
  accent:"#6366F1", accentDim:"rgba(99,102,241,0.12)", violet:"#8B5CF6",
  cyan:"#22D3EE", green:"#10B981", amber:"#F59E0B", red:"#EF4444",
  text0:"#F1F0FF", text1:"#A8A9C0", text2:"#5C5E78",
  mono:"'JetBrains Mono', monospace", sans:"'Space Grotesk', sans-serif", body:"'Inter', sans-serif",
};

export function hex2rgb(h){const r=parseInt(h.slice(1,3),16),g=parseInt(h.slice(3,5),16),b=parseInt(h.slice(5,7),16);return`${r},${g},${b}`;}
export function pct(c,t){return Math.round(c/t*100);}
export function fmt(n){return n>=1000?(n/1000).toFixed(1)+"k":String(n);}
export function trunc(s,n){return s.length>n?s.slice(0,n)+"…":s;}
