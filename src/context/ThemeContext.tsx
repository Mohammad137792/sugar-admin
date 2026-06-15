import React, { createContext, useContext, useState } from "react";
import { useColorScheme } from "react-native";
import { dark, light, ThemeColors } from "../constants/theme";

type ThemeMode = "light" | "dark";

interface ThemeContextType {
  mode:        ThemeMode;
  isDark:      boolean;
  colors:      ThemeColors;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  mode:        "dark",
  isDark:      true,
  colors:      dark,
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>(system === "light" ? "light" : "dark");

  const toggleTheme = () => setMode((m) => (m === "dark" ? "light" : "dark"));

  return (
    <ThemeContext.Provider
      value={{ mode, isDark: mode === "dark", colors: mode === "dark" ? dark : light, toggleTheme }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
