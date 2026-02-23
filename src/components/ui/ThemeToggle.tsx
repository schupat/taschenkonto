"use client";

import { useTheme } from "@/components/ThemeProvider";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const next: "light" | "dark" | "system" =
    theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
  const icon = theme === "light" ? "☀️" : theme === "dark" ? "🌙" : "💻";
  const label = theme === "light" ? "Hell" : theme === "dark" ? "Dunkel" : "System";

  return (
    <button
      onClick={() => setTheme(next)}
      className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-text-secondary hover:bg-bg-app hover:text-text-primary transition-colors"
      title={`Theme: ${label}`}
    >
      <span>{icon}</span>
    </button>
  );
}
