export interface ThemeColors {
  // Backgrounds
  bg:      string;
  surface: string;
  card:    string;
  overlay: string;

  // Borders
  border:      string;
  borderStrong: string;

  // Text
  textPrimary:   string;
  textSecondary: string;
  textMuted:     string;
  textFaint:     string;

  // Brand (same in both themes)
  violet:      string;
  violetLight: string;
  violetDim:   string;
  pink:        string;
  pinkLight:   string;

  // Glows / ambients
  glowVioletOpacity: number;
  glowPinkOpacity:   number;

  // Feature icon badge
  iconBadgeBg:     string;
  iconBadgeBorder: string;

  // About / mission
  missionBg:     string;
  missionText:   string;

  // Buttons
  btnSecondaryBg:     string;
  btnSecondaryBorder: string;
  btnSecondaryText:   string;

  // Semantic
  success: string;
  warning: string;
  error:   string;
  info:    string;
}

export const dark: ThemeColors = {
  bg:      "#07080F",
  surface: "#0E1018",
  card:    "#111320",
  overlay: "rgba(0,0,0,0.6)",

  border:       "rgba(255,255,255,0.08)",
  borderStrong: "rgba(255,255,255,0.15)",

  textPrimary:   "#FFFFFF",
  textSecondary: "#E5E7EB",
  textMuted:     "#6B7280",
  textFaint:     "rgba(255,255,255,0.15)",

  violet:      "#7C3AED",
  violetLight: "#A78BFA",
  violetDim:   "rgba(124,58,237,0.12)",
  pink:        "#DB2777",
  pinkLight:   "#F472B6",

  glowVioletOpacity: 0.09,
  glowPinkOpacity:   0.06,

  iconBadgeBg:     "rgba(124,58,237,0.12)",
  iconBadgeBorder: "rgba(124,58,237,0.22)",

  missionBg:   "rgba(124,58,237,0.06)",
  missionText: "#C4B5FD",

  btnSecondaryBg:     "rgba(255,255,255,0.03)",
  btnSecondaryBorder: "rgba(255,255,255,0.08)",
  btnSecondaryText:   "#E5E7EB",

  success: "#10B981",
  warning: "#F59E0B",
  error:   "#EF4444",
  info:    "#3B82F6",
};

export const light: ThemeColors = {
  bg:      "#F5F3FF",
  surface: "#FFFFFF",
  card:    "#FFFFFF",
  overlay: "rgba(0,0,0,0.3)",

  border:       "rgba(0,0,0,0.07)",
  borderStrong: "rgba(0,0,0,0.15)",

  textPrimary:   "#0A0A0A",
  textSecondary: "#1C1C1E",
  textMuted:     "#6E6E73",
  textFaint:     "rgba(0,0,0,0.18)",

  violet:      "#6D28D9",
  violetLight: "#7C3AED",
  violetDim:   "rgba(109,40,217,0.08)",
  pink:        "#BE185D",
  pinkLight:   "#DB2777",

  glowVioletOpacity: 0.07,
  glowPinkOpacity:   0.05,

  iconBadgeBg:     "rgba(109,40,217,0.07)",
  iconBadgeBorder: "rgba(109,40,217,0.15)",

  missionBg:   "rgba(109,40,217,0.05)",
  missionText: "#6D28D9",

  btnSecondaryBg:     "rgba(109,40,217,0.05)",
  btnSecondaryBorder: "rgba(109,40,217,0.2)",
  btnSecondaryText:   "#6D28D9",

  success: "#059669",
  warning: "#D97706",
  error:   "#DC2626",
  info:    "#2563EB",
};
