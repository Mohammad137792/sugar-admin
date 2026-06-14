export const colors = {
  // ── Backgrounds ──────────────────────────
  bg:      "#07080F",
  surface: "#0E1018",
  card:    "#111320",
  overlay: "rgba(0,0,0,0.6)",

  // ── Borders ──────────────────────────────
  border:       "rgba(255,255,255,0.08)",
  borderStrong: "rgba(255,255,255,0.15)",

  // ── Brand ────────────────────────────────
  violet:      "#7C3AED",
  violetLight: "#A78BFA",
  violetDim:   "rgba(124,58,237,0.15)",
  pink:        "#DB2777",
  pinkLight:   "#F472B6",
  pinkDim:     "rgba(219,39,119,0.12)",

  // ── Gradients (use with LinearGradient) ──
  gradientBrand: ["#7C3AED", "#DB2777"] as const,
  gradientDark:  ["#1A0A3E", "#07080F"] as const,
  gradientCard:  ["#141520", "#0E1018"] as const,

  // ── Text ─────────────────────────────────
  textPrimary:   "#FFFFFF",
  textSecondary: "#E5E7EB",
  textMuted:     "#6B7280",
  textFaint:     "rgba(255,255,255,0.2)",

  // ── Semantic ─────────────────────────────
  success: "#10B981",
  warning: "#F59E0B",
  error:   "#EF4444",
  info:    "#3B82F6",

  successDim: "rgba(16,185,129,0.12)",
  warningDim: "rgba(245,158,11,0.12)",
  errorDim:   "rgba(239,68,68,0.12)",
  infoDim:    "rgba(59,130,246,0.12)",
} as const;

export type ColorKey = keyof typeof colors;
