import { useState } from "react";
import { useClerk } from "@clerk/clerk-react";
import { T } from "../lib/theme";
import { getOrCreateGuestToken, fetchGuestInit, GUEST_SCAN_LIMIT } from "../lib/auth";

export function HomePage({ onGuestAccess }) {
  const { openSignIn } = useClerk();
  const [guestLoading, setGuestLoading] = useState(false);
  const [guestError, setGuestError] = useState(null);

  async function handleContinueAsGuest() {
    setGuestError(null);
    setGuestLoading(true);
    try {
      const token = getOrCreateGuestToken();
      const { remainingScans } = await fetchGuestInit(token);
      onGuestAccess({
        tier: "guest",
        planName: "Guest",
        scanLimit: GUEST_SCAN_LIMIT,
        remainingScans,
        loading: false,
        error: null,
      });
    } catch {
      setGuestError("Couldn't start your guest session — try again.");
    } finally {
      setGuestLoading(false);
    }
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 620,
        gap: 24,
        background: T.bg0,
        color: T.text0,
        fontFamily: T.body,
        textAlign: "center",
        padding: 20,
      }}
    >
      <div style={{ fontSize: 28, fontWeight: 700, fontFamily: T.sans, letterSpacing: "-.5px" }}>
        WebSight
      </div>
      <div style={{ fontSize: 15, color: T.text1, maxWidth: 420 }}>
        See exactly what's on a website — sitemap, page templates, and every
        third-party API it talks to.
      </div>
      <div style={{ display: "flex", gap: 12 }}>
        <button
          onClick={() => openSignIn()}
          style={{
            padding: "10px 26px",
            background: `linear-gradient(135deg,${T.accent},${T.violet})`,
            border: "none",
            borderRadius: 8,
            color: "#fff",
            fontSize: 14,
            fontFamily: T.sans,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Log in
        </button>
        <button
          onClick={handleContinueAsGuest}
          disabled={guestLoading}
          style={{
            padding: "10px 26px",
            background: T.bg2,
            border: `1px solid ${T.border}`,
            borderRadius: 8,
            color: T.text0,
            fontSize: 14,
            fontFamily: T.sans,
            fontWeight: 600,
            cursor: guestLoading ? "default" : "pointer",
            opacity: guestLoading ? 0.6 : 1,
          }}
        >
          {guestLoading ? "Starting…" : "Continue as Guest"}
        </button>
      </div>
      {guestError && (
        <div style={{ fontSize: 13, color: T.red, fontFamily: T.body }}>{guestError}</div>
      )}
    </div>
  );
}
