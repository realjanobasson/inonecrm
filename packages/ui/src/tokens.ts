// Strong UI tokens for InOneCRM apps (App + Admin)
// Keep UI dense, enterprise, 1px borders. Accent uses InOneCRM brand color.

export const strongUI = {
  colors: {
    bg: "#0B1020",          // deep navy
    panel: "#0E1630",       // panel
    panel2: "#0B1226",      // deeper panel
    text: "#F8FAFC",
    muted: "rgba(248,250,252,.72)",
    border: "rgba(148,163,184,.18)",
    accent: "#45D1D5",      // brand
    accent2: "#00FFEF",     // optional neon
    danger: "#EF4444",
    success: "#22C55E"
  },
  radius: { sm: "8px", md: "12px", lg: "16px" },
  density: { row: 36, cellPad: 10 }
} as const;
