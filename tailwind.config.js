/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./screens/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        sugar: {
          // ── Backgrounds
          bg:      "#07080F",
          surface: "#0E1018",
          card:    "#111320",

          // ── Brand
          violet:       "#7C3AED",
          "violet-light": "#A78BFA",
          "violet-dim":   "rgba(124,58,237,0.15)",
          pink:         "#DB2777",
          "pink-light": "#F472B6",
          "pink-dim":   "rgba(219,39,119,0.12)",

          // ── Text
          "text-primary":   "#FFFFFF",
          "text-secondary": "#E5E7EB",
          "text-muted":     "#6B7280",

          // ── Borders
          border:       "rgba(255,255,255,0.08)",
          "border-strong": "rgba(255,255,255,0.15)",

          // ── Semantic
          success: "#10B981",
          warning: "#F59E0B",
          error:   "#EF4444",
          info:    "#3B82F6",
        },
      },
    },
  },
  plugins: [],
};
