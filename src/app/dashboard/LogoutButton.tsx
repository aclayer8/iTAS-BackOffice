"use client";

import { signOut } from "next-auth/react";

export default function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        width: "100%",
        marginTop: "10px",
        padding: "8px 12px",
        background: "rgba(239,68,68,0.1)",
        border: "1px solid rgba(239,68,68,0.2)",
        borderRadius: "8px",
        color: "#f87171",
        fontSize: "13px",
        fontWeight: 600,
        cursor: "pointer",
        transition: "background 0.15s",
        fontFamily: "inherit",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(239,68,68,0.2)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(239,68,68,0.1)")}
    >
      <span style={{ fontSize: "15px" }}>&#x2192;</span>
      Sign Out
    </button>
  );
}
