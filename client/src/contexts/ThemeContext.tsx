import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";
export type ColorTheme = "coral" | "ocean" | "lavender" | "emerald" | "sunset" | "sakura";

export const COLOR_THEMES: { id: ColorTheme; label: { zh: string; en: string }; preview: string }[] = [
  { id: "coral",    label: { zh: "珊瑚", en: "Coral" },    preview: "oklch(0.65 0.22 15)" },
  { id: "ocean",    label: { zh: "海洋", en: "Ocean" },    preview: "oklch(0.55 0.18 230)" },
  { id: "lavender", label: { zh: "薰衣草", en: "Lavender" }, preview: "oklch(0.58 0.2 290)" },
  { id: "emerald",  label: { zh: "翡翠", en: "Emerald" },  preview: "oklch(0.55 0.2 155)" },
  { id: "sunset",   label: { zh: "日落", en: "Sunset" },   preview: "oklch(0.65 0.2 45)" },
  { id: "sakura",   label: { zh: "櫻花", en: "Sakura" },   preview: "oklch(0.7 0.15 350)" },
];

interface ThemeContextType {
  theme: Theme;
  colorTheme: ColorTheme;
  toggleTheme?: () => void;
  setColorTheme: (ct: ColorTheme) => void;
  switchable: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  switchable?: boolean;
}

const STORAGE_KEY = "unigo-theme";
const COLOR_STORAGE_KEY = "unigo-color-theme";

export function ThemeProvider({
  children,
  defaultTheme = "light",
  switchable = false,
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (switchable && typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "light" || stored === "dark") return stored;
    }
    return defaultTheme;
  });

  const [colorTheme, setColorThemeState] = useState<ColorTheme>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(COLOR_STORAGE_KEY);
      if (stored && COLOR_THEMES.some(t => t.id === stored)) return stored as ColorTheme;
    }
    return "coral";
  });

  useEffect(() => {
    const root = document.documentElement;
    localStorage.removeItem("theme");
    if (theme === "dark") { root.classList.add("dark"); } else { root.classList.remove("dark"); }
    if (switchable) { localStorage.setItem(STORAGE_KEY, theme); }
  }, [theme, switchable]);

  useEffect(() => {
    const root = document.documentElement;
    COLOR_THEMES.forEach(t => root.classList.remove(`theme-${t.id}`));
    if (colorTheme !== "coral") { root.classList.add(`theme-${colorTheme}`); }
    localStorage.setItem(COLOR_STORAGE_KEY, colorTheme);
  }, [colorTheme]);

  const toggleTheme = switchable
    ? () => setTheme(prev => (prev === "light" ? "dark" : "light"))
    : undefined;

  const setColorTheme = (ct: ColorTheme) => setColorThemeState(ct);

  return (
    <ThemeContext.Provider value={{ theme, colorTheme, toggleTheme, setColorTheme, switchable }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) { throw new Error("useTheme must be used within ThemeProvider"); }
  return context;
}
