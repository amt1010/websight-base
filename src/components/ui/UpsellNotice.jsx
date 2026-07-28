import { T } from "../../lib/theme";

export function UpsellNotice({ title, message }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        minHeight: 300,
        padding: "40px 20px",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 28 }}>🔒</div>
      <div style={{ fontSize: 15, fontWeight: 600, color: T.text0, fontFamily: T.sans }}>{title}</div>
      <div style={{ fontSize: 13, color: T.text1, fontFamily: T.body, maxWidth: 360 }}>{message}</div>
    </div>
  );
}
